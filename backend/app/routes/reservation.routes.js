module.exports = (app) => {
    const reservation = require('../controllers/reservation.controller');
    var router = require('express').Router();

    router.post('/', reservation.createReservation);
    // router.put('/:id', reservation.updateReservationStatus);
    // router.get('/', reservation.getAllReservations);
    // router.get('/:id', reservation.getReservationById);
    // router.put('/:id', reservation.updateReservation);
    // router.delete('/:id', reservation.deleteReservation);
    router.get('/history', reservation.getReservationsByCustomer);
    router.post('/checkin/:tableId', reservation.checkinReservation);
    router.get('/:tableId', reservation.getReservationByTableId);
    router.put('/:tableId/complete', reservation.completeReservation);

    app.use('/api/reservations', router);
}

