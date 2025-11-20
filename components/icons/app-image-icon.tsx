"use client";

import Image from "next/image";
import { useState } from "react";

interface AppImageIconProps {
  src: string;
  alt: string;
  className?: string;
  size?: number;
}

export function AppImageIcon({
  src,
  alt,
  className,
  size = 24,
}: AppImageIconProps) {
  const [error, setError] = useState(false);

  return (
    <div
      className={`overflow-hidden rounded-md transition-all duration-200 hover:scale-110 ${className}`}
      style={{ width: size, height: size }}
    >
      {error ? (
        <div className="flex items-center justify-center w-full h-full bg-gray-200 text-[10px]">
          N/A
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          onError={() => setError(true)}
          className="rounded-md object-cover"
        />
      )}
    </div>
  );
}
