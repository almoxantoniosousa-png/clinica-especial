export default function ChatLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="-mt-4 md:-mt-8 -mx-4 md:-mx-8 pt-16 md:pt-0 h-screen overflow-hidden">
        {children}
      </div>
    );
  }