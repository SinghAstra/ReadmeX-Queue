"use client";

import React, { Suspense } from "react";

interface Props {
  children: React.ReactNode;
}

const LoadingFallback = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
};

const Providers = ({ children }: Props) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      {/* <SessionProvider> */}
      {children}
      {/* </SessionProvider> */}
    </Suspense>
  );
};

export default Providers;
