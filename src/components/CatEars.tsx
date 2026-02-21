import { SVGProps } from "react";

export function CatEars(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 384 100"
      preserveAspectRatio="none"
      {...props}
    >
      {/* Left Ear */}
      <path
        d="M 20 100 Q 50 10 90 5 Q 130 10 160 100"
        stroke="black"
        strokeWidth="4"
        fill="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Ear */}
      <path
        d="M 224 100 Q 254 10 294 5 Q 334 10 364 100"
        stroke="black"
        strokeWidth="4"
        fill="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
