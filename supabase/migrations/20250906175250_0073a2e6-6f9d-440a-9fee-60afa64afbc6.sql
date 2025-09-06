-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'residential',
  total_tokens INTEGER NOT NULL,
  token_price DECIMAL(10,2) NOT NULL,
  tokens_sold INTEGER NOT NULL DEFAULT 0,
  estimated_roi DECIMAL(5,2) NOT NULL,
  image_url TEXT,
  gallery_urls TEXT[],
  investment_terms TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create token purchases table
CREATE TABLE public.token_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tokens_purchased INTEGER NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url TEXT
);

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.token_purchases(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL,
  property_title TEXT NOT NULL,
  tokens_owned INTEGER NOT NULL,
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_url TEXT
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create policies for properties (public read access)
CREATE POLICY "Anyone can view properties" 
ON public.properties 
FOR SELECT 
USING (true);

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for token purchases
CREATE POLICY "Users can view their own purchases" 
ON public.token_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" 
ON public.token_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for certificates
CREATE POLICY "Users can view their own certificates" 
ON public.certificates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own certificates" 
ON public.certificates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Insert sample properties
INSERT INTO public.properties (title, description, location, property_type, total_tokens, token_price, tokens_sold, estimated_roi, image_url, investment_terms, status) VALUES
('Modern Downtown Apartment Complex', 'Luxury 24-unit apartment complex in the heart of downtown. High-demand rental market with consistent occupancy rates above 95%.', 'Downtown Seattle, WA', 'residential', 10000, 50.00, 2340, 8.5, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop', 'Minimum investment: 10 tokens. Profit distribution quarterly. 5-year investment term.', 'active'),
('Industrial Warehouse Portfolio', 'Strategic collection of 3 warehouses in prime logistics corridor. Long-term leases with established e-commerce companies.', 'Phoenix, AZ', 'commercial', 15000, 75.00, 4560, 12.2, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop', 'Minimum investment: 20 tokens. Profit distribution monthly. 7-year investment term.', 'active'),
('Luxury Beachfront Resort', 'Boutique resort with 18 suites overlooking pristine coastline. Premium vacation rental market with year-round demand.', 'Malibu, CA', 'hospitality', 25000, 100.00, 8920, 15.8, 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop', 'Minimum investment: 50 tokens. Profit distribution bi-annually. 10-year investment term.', 'active'),
('Tech Campus Office Building', 'Class A office space in emerging tech hub. Flexible workspace design attracting startups and established tech companies.', 'Austin, TX', 'commercial', 12000, 65.00, 3200, 9.7, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop', 'Minimum investment: 15 tokens. Profit distribution quarterly. 8-year investment term.', 'active'),
('Historic Renovation Project', 'Beautifully restored 1920s building converted into premium loft apartments. Located in vibrant arts district.', 'Portland, OR', 'residential', 8000, 45.00, 1820, 7.3, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop', 'Minimum investment: 10 tokens. Profit distribution quarterly. 6-year investment term.', 'active'),
('Suburban Shopping Center', 'Well-established retail center with anchor tenants and high foot traffic. Prime location near residential developments.', 'Plano, TX', 'retail', 18000, 55.00, 5670, 10.1, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop', 'Minimum investment: 10 tokens. Profit distribution monthly. 9-year investment term.', 'active');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();