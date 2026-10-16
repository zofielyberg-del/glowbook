'use client';

export default function FlowingBackground() {
  // PURE QUIET LUXURY
  // No moving gradients. No clouds. No noise.
  // Just a pure, incredibly deep dark background to make the gold and typography pop.
  // This is the true hallmark of expensive, high-end brands.

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-background">
      {/* Ambient luxury light layers */}
      <div 
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[550px] opacity-40 dark:opacity-25 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(197, 179, 88, 0.18) 0%, rgba(212, 175, 55, 0.05) 45%, rgba(0,0,0,0) 70%)',
        }}
      />
      <div 
        className="absolute top-20 right-[15%] w-[450px] h-[350px] opacity-25 dark:opacity-15 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(230, 223, 201, 0.4) 0%, rgba(0,0,0,0) 65%)',
        }}
      />
      
      {/* Bottom gradient mask for smooth transition */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
