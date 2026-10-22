import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-bold">Page not found</h1>
      <Link to="/" className="mt-3 inline-block text-palm-700 underline">Go home</Link>
    </div>
  )
}
