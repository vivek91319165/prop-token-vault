import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import type { User } from '@supabase/supabase-js';

interface Certificate {
  id: string;
  user_id: string;
  purchase_id: string;
  certificate_number: string;
  tokens_owned: number;
  property_title: string;
  pdf_url: string | null;
  issue_date: string;
}

export const useCertificates = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (currentUser: User) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();
    
    setProfile(profileData);
  };

  const fetchCertificates = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast({
        title: "Error",
        description: "Failed to load certificates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile(user);
      fetchCertificates(user);
    } else {
      setCertificates([]);
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  // Real-time subscription for new certificates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('certificate-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'certificates',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newCert = payload.new as Certificate;
          setCertificates(prev => [newCert, ...prev]);
          
          toast({
            title: "New Certificate Created",
            description: `Certificate for ${newCert.property_title} has been issued`,
          });
          
          // Auto-generate PDF if not exists
          if (!newCert.pdf_url && profile) {
            setTimeout(() => {
              generateCertificatePDF(newCert);
            }, 1000); // Small delay to ensure UI updates
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const generateCertificatePDF = async (certificate: Certificate) => {
    try {
      if (!profile || !user) return;

      const pdf = new jsPDF();
      
      // Set up the PDF content
      pdf.setFontSize(24);
      pdf.text('DIGITAL PROPERTY CERTIFICATE', 105, 30, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.text('Certificate of Ownership', 105, 50, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Certificate Number: ${certificate.certificate_number}`, 20, 80);
      pdf.text(`Property: ${certificate.property_title}`, 20, 100);
      pdf.text(`Token Holder: ${profile.first_name} ${profile.last_name}`, 20, 120);
      pdf.text(`Tokens Owned: ${certificate.tokens_owned}`, 20, 140);
      pdf.text(`Issue Date: ${new Date(certificate.issue_date).toLocaleDateString()}`, 20, 160);
      
      pdf.setFontSize(10);
      pdf.text('This certificate represents digital ownership of property tokens', 20, 200);
      pdf.text('and is legally binding according to our terms of service.', 20, 210);
      
      // Convert PDF to blob
      const pdfBlob = pdf.output('blob');
      
      // Upload to Supabase Storage
      const fileName = `${user.id}/${certificate.id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName);

      // Update certificate with PDF URL
      const { error: updateError } = await supabase
        .from('certificates')
        .update({ pdf_url: publicUrl })
        .eq('id', certificate.id);

      if (updateError) throw updateError;

      // Update token purchase as certificate issued
      await supabase
        .from('token_purchases')
        .update({ 
          certificate_issued: true,
          certificate_url: publicUrl 
        })
        .eq('id', certificate.purchase_id);

      // Update local state
      setCertificates(prev => 
        prev.map(cert => 
          cert.id === certificate.id 
            ? { ...cert, pdf_url: publicUrl }
            : cert
        )
      );

      toast({
        title: "Certificate Ready",
        description: `Digital certificate for ${certificate.property_title} is now available for download`,
      });

    } catch (error) {
      console.error('Error generating certificate PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate certificate PDF",
        variant: "destructive",
      });
    }
  };

  const downloadCertificate = (certificate: Certificate) => {
    if (certificate.pdf_url) {
      window.open(certificate.pdf_url, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Certificate PDF not available",
        variant: "destructive",
      });
    }
  };

  return {
    certificates,
    loading,
    generateCertificatePDF,
    downloadCertificate,
    refetch: () => user && fetchCertificates(user),
  };
};