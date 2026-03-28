export default function MdxLayout({ children }: { children: React.ReactNode }) {
  return (
    // use prose for styling: https://tailwindcss.com/docs/typography-plugin
    <div className="prose">
      {children}
    </div>
  )
}