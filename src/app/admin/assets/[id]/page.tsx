import { getAssetWithJobs } from "@/app/actions/asset-actions";
import { formatKES, formatDate, statusColor, statusLabel } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const asset = await getAssetWithJobs(params.id);
  if (!asset) notFound();

  const jobs = asset.jobs;
  const totalRevenue = jobs.reduce(
    (sum, j) => sum + (j.invoice?.status === "PAID" ? j.invoice.amount : 0),
    0
  );
  const completedCount = jobs.filter(
    (j) => j.status === "VERIFIED" || j.status === "CLOSED"
  ).length;

  const warrantyActive =
    asset.warrantyExpiryDate && new Date(asset.warrantyExpiryDate) > new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/assets" className="hover:text-blue-600">
          Assets
        </Link>
        <span>/</span>
        <span className="text-gray-700 truncate">{asset.name}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                {asset.assetType}
              </span>
              {warrantyActive && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">
                  Under warranty
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Owned by <span className="font-medium text-gray-700">{asset.clientName}</span>
              {asset.clientPhone && <> · {asset.clientPhone}</>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <Stat label="Total Jobs" value={jobs.length.toString()} />
          <Stat label="Completed" value={completedCount.toString()} />
          <Stat label="Lifetime Revenue" value={formatKES(totalRevenue)} />
          <Stat
            label="Last Service"
            value={asset.lastServiceDate ? formatDate(asset.lastServiceDate) : "—"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-6 pt-6 border-t border-gray-100 text-sm">
          {asset.location && (
            <Info label="Location" value={asset.location} />
          )}
          {asset.zone && <Info label="Zone" value={asset.zone} />}
          {asset.identifier && <Info label="Identifier" value={asset.identifier} />}
          {asset.serialNumber && <Info label="Serial Number" value={asset.serialNumber} />}
          {asset.registrationNumber && (
            <Info label="Registration" value={asset.registrationNumber} />
          )}
          {asset.deviceNumber && <Info label="Device" value={asset.deviceNumber} />}
          {asset.simNumber && <Info label="SIM" value={asset.simNumber} />}
          {asset.installationDate && (
            <Info label="Installed" value={formatDate(asset.installationDate)} />
          )}
          {asset.warrantyExpiryDate && (
            <Info
              label="Warranty Expires"
              value={formatDate(asset.warrantyExpiryDate)}
            />
          )}
        </div>

        {asset.notes && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{asset.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Service History{" "}
            <span className="text-gray-400 font-normal">({jobs.length})</span>
          </h2>
        </div>

        {jobs.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-gray-400">
            No jobs have been linked to this asset yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-6 py-3">Job</th>
                <th className="text-left px-6 py-3">Date</th>
                <th className="text-left px-6 py-3">Worker</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-right px-6 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{j.jobType}</p>
                    {j.description && (
                      <p className="text-xs text-gray-400 line-clamp-1">{j.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {formatDate(j.scheduledDate ?? j.createdAt)}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {j.workers.map((w) => w.name).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(j.status)}`}
                    >
                      {statusLabel(j.status)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-700">
                    {j.invoice ? formatKES(j.invoice.amount) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-gray-700 mt-0.5">{value}</p>
    </div>
  );
}
