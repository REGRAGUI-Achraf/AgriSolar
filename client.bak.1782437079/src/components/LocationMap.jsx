import React, { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MapCenterUpdater = ({ latitude, longitude }) => {
  const map = useMap();

  useEffect(() => {
    if (latitude === null || longitude === null) return;

    map.setView([latitude, longitude], Math.max(map.getZoom(), 13), {
      animate: true,
    });
  }, [latitude, longitude, map]);

  return null;
};

export default function LocationMap({ latitude, longitude }) {
  const isReady = latitude !== null && longitude !== null;
  const center = isReady ? [latitude, longitude] : [31.7917, -7.0926];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Aperçu de la position</p>
        <p className="mt-1 text-xs text-slate-500">Le marqueur se met à jour en temps réel selon les coordonnées saisies.</p>
      </div>

      <div className="h-72 w-full">
        <MapContainer center={center} zoom={isReady ? 13 : 5} scrollWheelZoom className="h-full w-full">
          <MapCenterUpdater latitude={latitude} longitude={longitude} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {isReady ? <Marker position={[latitude, longitude]} /> : null}
        </MapContainer>
      </div>

      <div className="flex items-start gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span aria-hidden="true">⚠️</span>
        <p>La carte interactive nécessite une connexion Internet active pour charger les tuiles.</p>
      </div>
    </div>
  );
}