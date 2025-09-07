
-- 1) Roles and role helpers

DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'seller_verified', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function to check roles (SECURITY DEFINER avoids recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Policies for user_roles
DO $$
BEGIN
  -- Users can see their own roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Admins can view all roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can view all roles'
  ) THEN
    CREATE POLICY "Admins can view all roles"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- Admins can manage roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can manage roles'
  ) THEN
    CREATE POLICY "Admins can manage roles"
      ON public.user_roles
      FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));

    CREATE POLICY "Admins can update roles"
      ON public.user_roles
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));

    CREATE POLICY "Admins can delete roles"
      ON public.user_roles
      FOR DELETE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

-- Helper to assign roles (callable by admins)
CREATE OR REPLACE FUNCTION public.assign_role(target_user_id uuid, target_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

--------------------------------------------------------------------------------
-- 2) Properties: add seller linkage and verification

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS seller_user_id uuid,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE public.properties
    ADD CONSTRAINT properties_seller_user_id_fkey
    FOREIGN KEY (seller_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- RLS policies for properties (SELECT already exists for all/anon)
-- Sellers can insert properties they own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='properties' AND policyname='Sellers can insert their properties'
  ) THEN
    CREATE POLICY "Sellers can insert their properties"
      ON public.properties
      FOR INSERT
      TO authenticated
      WITH CHECK (seller_user_id = auth.uid());
  END IF;

  -- Sellers can update their own properties (but a trigger will prevent changing is_verified)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='properties' AND policyname='Sellers can update their properties'
  ) THEN
    CREATE POLICY "Sellers can update their properties"
      ON public.properties
      FOR UPDATE
      TO authenticated
      USING (seller_user_id = auth.uid())
      WITH CHECK (seller_user_id = auth.uid());
  END IF;

  -- Admins can insert/update any property
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='properties' AND policyname='Admins can insert properties'
  ) THEN
    CREATE POLICY "Admins can insert properties"
      ON public.properties
      FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='properties' AND policyname='Admins can update properties'
  ) THEN
    CREATE POLICY "Admins can update properties"
      ON public.properties
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

-- Trigger to prevent non-admins from toggling is_verified
CREATE OR REPLACE FUNCTION public.prevent_nonadmin_verification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change verification status';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DO $$
BEGIN
  CREATE TRIGGER properties_prevent_nonadmin_verify
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE PROCEDURE public.prevent_nonadmin_verification_change();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

--------------------------------------------------------------------------------
-- 3) Wallets and transactions

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Wallet policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallets' AND policyname='Users can view their own wallet'
  ) THEN
    CREATE POLICY "Users can view their own wallet"
      ON public.wallets
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallets' AND policyname='Users can create their own wallet'
  ) THEN
    CREATE POLICY "Users can create their own wallet"
      ON public.wallets
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallets' AND policyname='Admins can view all wallets'
  ) THEN
    CREATE POLICY "Admins can view all wallets"
      ON public.wallets
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

-- Updated_at trigger
DO $$
BEGIN
  CREATE TRIGGER set_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit','withdrawal','purchase','profit','refund','adjustment')),
  amount numeric NOT NULL CHECK (amount > 0),
  metadata jsonb,
  purchase_id uuid REFERENCES public.token_purchases(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: owners can view their txns; admins can view all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallet_transactions' AND policyname='Users can view their own transactions'
  ) THEN
    CREATE POLICY "Users can view their own transactions"
      ON public.wallet_transactions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.wallets w
          WHERE w.id = wallet_id AND w.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallet_transactions' AND policyname='Admins can view all transactions'
  ) THEN
    CREATE POLICY "Admins can view all transactions"
      ON public.wallet_transactions
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

--------------------------------------------------------------------------------
-- 4) Auto-create wallet when a profile is created (avoids touching auth schema)

CREATE OR REPLACE FUNCTION public.create_wallet_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.create_wallet_for_profile();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

--------------------------------------------------------------------------------
-- 5) Purchase flow and deposits

-- Sandbox deposit for demo or testing
CREATE OR REPLACE FUNCTION public.deposit_to_wallet(p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_balance numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = auth.uid();
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (auth.uid()) RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE public.wallets
    SET balance = balance + p_amount
  WHERE id = v_wallet_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, metadata)
  VALUES (v_wallet_id, 'deposit', p_amount, jsonb_build_object('source','sandbox'));

  RETURN v_balance;
END;
$$;

-- Atomic purchase (checks balance, records purchase, transaction, certificate shell)
CREATE OR REPLACE FUNCTION public.purchase_tokens(p_property_id uuid, p_tokens integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
  v_cost numeric;
  v_wallet_id uuid;
  v_balance numeric;
  v_purchase_id uuid;
  v_property_title text;
  v_certificate_id uuid;
BEGIN
  IF p_tokens IS NULL OR p_tokens <= 0 THEN
    RAISE EXCEPTION 'Tokens must be a positive integer';
  END IF;

  SELECT token_price, title INTO v_price, v_property_title
  FROM public.properties
  WHERE id = p_property_id AND status = 'active';

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Property not found or not active';
  END IF;

  v_cost := v_price * p_tokens;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = auth.uid();

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (auth.uid()) RETURNING id, balance INTO v_wallet_id, v_balance;
  END IF;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Deduct balance
  UPDATE public.wallets
    SET balance = balance - v_cost
  WHERE id = v_wallet_id;

  -- Record purchase
  INSERT INTO public.token_purchases (user_id, property_id, tokens_purchased, total_cost, certificate_issued)
  VALUES (auth.uid(), p_property_id, p_tokens, v_cost, false)
  RETURNING id INTO v_purchase_id;

  -- Record wallet transaction
  INSERT INTO public.wallet_transactions (wallet_id, type, amount, purchase_id, property_id, metadata)
  VALUES (v_wallet_id, 'purchase', v_cost, v_purchase_id, p_property_id, jsonb_build_object('tokens', p_tokens));

  -- Increment tokens_sold
  UPDATE public.properties
    SET tokens_sold = tokens_sold + p_tokens
  WHERE id = p_property_id;

  -- Create certificate record (pdf_url will be attached by client)
  INSERT INTO public.certificates (user_id, purchase_id, certificate_number, tokens_owned, property_title)
  VALUES (
    auth.uid(),
    v_purchase_id,
    'CERT-' || left(replace(gen_random_uuid()::text, '-', ''), 12),
    p_tokens,
    v_property_title
  )
  RETURNING id INTO v_certificate_id;

  RETURN json_build_object(
    'purchase_id', v_purchase_id,
    'certificate_id', v_certificate_id
  );
END;
$$;

--------------------------------------------------------------------------------
-- 6) Profit distributions to holders

CREATE TABLE IF NOT EXISTS public.profit_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL,
  per_token_amount numeric NOT NULL,
  distribution_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  notes text
);

ALTER TABLE public.profit_distributions ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can view/insert; Verified sellers can view/insert for their property
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profit_distributions' AND policyname='Admins can manage distributions'
  ) THEN
    CREATE POLICY "Admins can manage distributions"
      ON public.profit_distributions
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profit_distributions' AND policyname='Sellers can manage their distributions'
  ) THEN
    CREATE POLICY "Sellers can manage their distributions"
      ON public.profit_distributions
      FOR ALL
      TO authenticated
      USING (
        public.has_role(auth.uid(), 'seller_verified')
        AND EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = property_id AND p.seller_user_id = auth.uid()
        )
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'seller_verified')
        AND EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = property_id AND p.seller_user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Function: distribute profits to holders
CREATE OR REPLACE FUNCTION public.distribute_property_profit(p_property_id uuid, p_total_amount numeric, p_notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_tokens integer;
  v_per_token numeric;
  v_dist_id uuid;
  rec record;
BEGIN
  -- Only admins or verified sellers for this property
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'seller_verified')
      AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = p_property_id AND p.seller_user_id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to distribute profits for this property';
  END IF;

  IF p_total_amount <= 0 THEN
    RAISE EXCEPTION 'Total amount must be positive';
  END IF;

  SELECT COALESCE(SUM(tp.tokens_purchased), 0)::int
    INTO v_total_tokens
  FROM public.token_purchases tp
  WHERE tp.property_id = p_property_id;

  IF v_total_tokens = 0 THEN
    RAISE EXCEPTION 'No tokens issued for this property';
  END IF;

  v_per_token := p_total_amount / v_total_tokens;

  INSERT INTO public.profit_distributions (property_id, total_amount, per_token_amount, created_by, notes)
  VALUES (p_property_id, p_total_amount, v_per_token, auth.uid(), p_notes)
  RETURNING id INTO v_dist_id;

  -- For each holder, credit wallet and add transaction
  FOR rec IN
    SELECT tp.user_id, SUM(tp.tokens_purchased)::int AS user_tokens
    FROM public.token_purchases tp
    WHERE tp.property_id = p_property_id
    GROUP BY tp.user_id
  LOOP
    PERFORM 1 FROM public.wallets w WHERE w.user_id = rec.user_id;
    IF NOT FOUND THEN
      INSERT INTO public.wallets (user_id) VALUES (rec.user_id);
    END IF;

    -- Credit amount
    UPDATE public.wallets
      SET balance = balance + (v_per_token * rec.user_tokens)
    WHERE user_id = rec.user_id;

    -- Insert transaction
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, property_id, metadata)
    SELECT w.id, 'profit', (v_per_token * rec.user_tokens), p_property_id,
           jsonb_build_object('distribution_id', v_dist_id, 'per_token', v_per_token, 'tokens', rec.user_tokens)
    FROM public.wallets w
    WHERE w.user_id = rec.user_id;
  END LOOP;

  RETURN v_dist_id;
END;
$$;

--------------------------------------------------------------------------------
-- 7) Allow owners and admins to update certificate and purchase flags

-- Certificates: allow owners to UPDATE (e.g., set pdf_url after client upload)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificates' AND policyname='Users can update their own certificates'
  ) THEN
    CREATE POLICY "Users can update their own certificates"
      ON public.certificates
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificates' AND policyname='Admins can view all certificates'
  ) THEN
    CREATE POLICY "Admins can view all certificates"
      ON public.certificates
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

-- Token purchases: allow owners to update their own purchase (e.g., set certificate_issued or certificate_url)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='token_purchases' AND policyname='Users can update their own purchases'
  ) THEN
    CREATE POLICY "Users can update their own purchases"
      ON public.token_purchases
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='token_purchases' AND policyname='Admins can view all purchases'
  ) THEN
    CREATE POLICY "Admins can view all purchases"
      ON public.token_purchases
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

--------------------------------------------------------------------------------
-- 8) Storage bucket for certificate PDFs

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'certificates'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('certificates', 'certificates', true);
  END IF;
END
$$;

-- Storage policies for the 'certificates' bucket
-- Public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read for certificates'
  ) THEN
    CREATE POLICY "Public read for certificates"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'certificates');
  END IF;

  -- Authenticated can upload/update/delete within their user folder: certificates/<user_id>/...
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload certificates to their folder'
  ) THEN
    CREATE POLICY "Users can upload certificates to their folder"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'certificates'
        AND position((auth.uid()::text || '/') in name) = 1
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update their own certificate files'
  ) THEN
    CREATE POLICY "Users can update their own certificate files"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'certificates'
        AND position((auth.uid()::text || '/') in name) = 1
      )
      WITH CHECK (
        bucket_id = 'certificates'
        AND position((auth.uid()::text || '/') in name) = 1
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete their own certificate files'
  ) THEN
    CREATE POLICY "Users can delete their own certificate files"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'certificates'
        AND position((auth.uid()::text || '/') in name) = 1
      );
  END IF;
END
$$;

--------------------------------------------------------------------------------
-- 9) Realtime configuration for key tables

ALTER TABLE ONLY public.wallets REPLICA IDENTITY FULL;
ALTER TABLE ONLY public.wallet_transactions REPLICA IDENTITY FULL;
ALTER TABLE ONLY public.token_purchases REPLICA IDENTITY FULL;
ALTER TABLE ONLY public.certificates REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.token_purchases;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.certificates;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
