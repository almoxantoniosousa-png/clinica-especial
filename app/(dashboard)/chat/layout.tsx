export default function ChatLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="-mt-4 md:-mt-8 -mx-4 md:-mx-8 h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
        {children}
      </div>
    );
  }