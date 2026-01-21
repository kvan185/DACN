export const getAllTables = async () => {
  try {
    const response = await fetch('/api/tables', {
      method: 'get'
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bàn:', error);
    throw error;
  }
};

export const createReservation = async (accessToken, tableId, specialRequests) => {
  try {
    const response = await fetch('/api/reservations', {
      method: 'post',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tableId,
        specialRequests
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi đặt bàn:', error);
    throw error;
  }
};

export const getTableByQRCode = async (qrCode) => {
  try {
    const response = await fetch(`/api/tables/qr/${qrCode}`, {
      method: 'get'
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi quét mã QR:', error);
    throw error;
  }
};

export const getReservationByTableId = async (accessToken, tableId) => {
  try {
    const response = await fetch(`/api/reservations/table/${tableId}`, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi lấy thông tin đặt bàn:', error);
    throw error;
  }
};

export const completeReservation = async (accessToken, tableId) => {
  try {
    const response = await fetch(`/api/reservations/${tableId}/complete`, {
      method: 'put',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi hoàn tất đặt bàn:', error);
    throw error;
  }
};

export const addTable = async (accessToken, tableData) => {
  try {
    const response = await fetch('/api/tables', {
      method: 'post',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tableData)
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi thêm bàn mới:', error);
    throw error;
  }
};

export const updateTable = async (accessToken, tableId, tableData) => {
  try {
    const response = await fetch(`/api/tables/${tableId}`, {
      method: 'put',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tableData)
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi cập nhật thông tin bàn:', error);
    throw error;
  }
};

export const deleteTable = async (accessToken, tableId) => {
  try {
    const response = await fetch(`/api/tables/${tableId}`, {
      method: 'delete',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi xóa bàn:', error);
    throw error;
  }
};

export const getUserReservations = async (accessToken) => {
  try {
    const response = await fetch('/api/reservations/user', {
      method: 'get',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử đặt bàn:', error);
    throw error;
  }
};

export const checkinReservation = async (tableId, confirmationCode) => {
  try {
    const response = await fetch(`/api/reservations/checkin/${tableId}`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirmationCode })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi checkin bàn:', error);
    throw error;
  }
};

export const checkTableAvailability = async (tableId) => {
  try {
    const response = await fetch(`/api/tables/${tableId}/availability`, {
      method: 'get'
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái bàn:', error);
    throw error;
  }
};
