module.exports = (app) => {
  const reservation = require('../controllers/reservation.controller');
  var router = require('express').Router();

  router.post('/', reservation.createReservation);

  // API lấy lịch sử đặt bàn (cần đăng nhập)
  router.get('/history', reservation.getReservationsByCustomer); 
  router.delete('/:reservationId', reservation.cancelReservation);
  router.get('/:tableId', reservation.getReservationByTableId);
  router.put('/:tableId/complete', reservation.completeReservation);
  router.post('/checkin/:tableId', reservation.checkinReservation);

  app.use('/api/reservations', router);
};