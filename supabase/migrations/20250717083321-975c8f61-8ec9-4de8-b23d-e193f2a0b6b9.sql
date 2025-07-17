-- Create enhanced code_generation_logs table with comprehensive audit fields
CREATE TABLE IF NOT EXISTS public.code_generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT,
  language VARCHAR(50),
  framework VARCHAR(50),
  code_length INTEGER,
  code_hash VARCHAR(64), -- SHA256 hash
  openai_latency_ms INTEGER,
  total_processing_ms INTEGER,
  user_id UUID,
  user_ip INET,
  request_count INTEGER DEFAULT 1,
  typescript_valid BOOLEAN,
  typescript_errors JSONB,
  eslint_warnings JSONB,
  eslint_errors JSONB,
  security_issues JSONB,
  test_code_generated BOOLEAN DEFAULT FALSE,
  test_code_valid BOOLEAN,
  test_code_errors JSONB,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.code_generation_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL, -- user_id or IP
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.code_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_generation_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since functions run with service role)
CREATE POLICY "Allow all access to code_generation_logs" 
ON public.code_generation_logs 
FOR ALL 
USING (true);

CREATE POLICY "Allow all access to code_generation_rate_limits" 
ON public.code_generation_rate_limits 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_code_generation_logs_user_id ON public.code_generation_logs(user_id);
CREATE INDEX idx_code_generation_logs_generated_at ON public.code_generation_logs(generated_at);
CREATE INDEX idx_code_generation_logs_code_hash ON public.code_generation_logs(code_hash);
CREATE INDEX idx_code_generation_rate_limits_identifier ON public.code_generation_rate_limits(identifier);
CREATE INDEX idx_code_generation_rate_limits_window_start ON public.code_generation_rate_limits(window_start);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_code_generation_rate_limits_updated_at
BEFORE UPDATE ON public.code_generation_rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();