import { Suspense } from 'react'
import EditModalClient from './EditModalClient'

export default function EditModalPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8">Loading modal...</div>}>
      <EditModalClient />
    </Suspense>
  )
}
