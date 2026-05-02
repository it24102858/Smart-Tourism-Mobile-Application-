const HOTEL_COMPONENT = 'hotel_villa_booking';
const TRANSPORT_COMPONENT = 'transport_booking';
const PLACES_COMPONENT = 'tourist_places_explorer';

const isHotelAdmin = user =>
  !!user && (
    user.role === 'owner' ||
    (user.role === 'admin' && user.adminComponent === HOTEL_COMPONENT)
  );

const isTransportAdmin = user =>
  !!user && user.role === 'admin' && user.adminComponent === TRANSPORT_COMPONENT;

const isPlacesAdmin = user =>
  !!user && user.role === 'admin' && user.adminComponent === PLACES_COMPONENT;

module.exports = {
  HOTEL_COMPONENT,
  TRANSPORT_COMPONENT,
  PLACES_COMPONENT,
  isHotelAdmin,
  isTransportAdmin,
  isPlacesAdmin,
};
