export default function OrgsPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Organizations</h1>
      <div className="bg-white rounded-lg border p-6">
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-semibold">Acme Corporation</h3>
            <p className="text-sm text-gray-600">acme-corp</p>
            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
          </div>
          <div className="border-b pb-4">
            <h3 className="font-semibold">Beta Industries</h3>
            <p className="text-sm text-gray-600">beta-industries</p>
            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
          </div>
          <div className="border-b pb-4">
            <h3 className="font-semibold">Gamma Startup</h3>
            <p className="text-sm text-gray-600">gamma-startup</p>
            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Inactive</span>
          </div>
        </div>
      </div>
    </div>
  )
}
