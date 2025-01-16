const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**.supabase.co',
          pathname: '/storage/v1/object/public/**',
        },
      ],
    },
    // output: "export"
  };
  
  export default nextConfig;
  