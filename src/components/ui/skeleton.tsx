import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> { }

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-md bg-white/10 ${className || ""}`}
            {...props}
        />
    );
}