import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';

import {
    Chart as ChartJS,
    LinearScale,
    CategoryScale,
    BarElement,
    PointElement,
    LineElement,
    Legend,
    Tooltip,
    LineController,
    BarController,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
    LinearScale,
    CategoryScale,
    BarElement,
    PointElement,
    LineElement,
    Legend,
    Tooltip,
    LineController,
    BarController
);
import './chart.scss';

function Charts(props) {
    const [timerRequest, setTimerRequest] = useState({ startDate: '', endDate: '', typeRevenue: '' });
    const [timer, setTimer] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState([]);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.classList.add('show-staff-scrollbar');
        document.body.classList.add('show-staff-scrollbar');
        
        return () => {
            if (mainContent) mainContent.classList.remove('show-staff-scrollbar');
            document.body.classList.remove('show-staff-scrollbar');
        };
    }, []);

    const data = {
        labels: timer || [],
        datasets: [
            {
                label: 'Doanh thu',
                data: totalRevenue || [],
                backgroundColor: 'rgba(26, 192, 115, 0.6)',
                borderColor: 'rgba(26, 192, 115, 1)',
                borderWidth: 1,
                type: 'bar',
                yAxisID: 'y',
            },
            {
                label: 'Xu hướng',
                fill: false,
                data: totalRevenue || [],
                backgroundColor: 'rgba(251, 140, 9, 1)',
                borderColor: 'rgba(251, 140, 9, 1)',
                borderWidth: 3,
                pointRadius: 4,
                type: 'line',
                yAxisID: 'y',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Doanh thu (đ)'
                }
            },
        },
    };

    const fetchStatistical = async (event) => {
        event.preventDefault();

        const response = await fetch('/api/revenue/calc', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ startDate: timerRequest.startDate, endDate: timerRequest.endDate, typeRevenue: timerRequest.typeRevenue })
        })
        const data = await response.json();

        if (data && data.result.length > 0) {
            const timerNew = data.result.map((item) => {
                let timeUnit;
                if (data.typeRevenue === 'Date') {
                    timeUnit = new Date(item[0]).getDate();
                    const month = new Date(item[0]).getMonth() + 1;
                    return `${timeUnit}/${month}`;
                } else if (data.typeRevenue === 'Month') {
                    timeUnit = new Date(item[0]).getMonth() + 1;
                    return 'Tháng ' + timeUnit;
                } else {
                    timeUnit = new Date(item[0]).getFullYear();
                    return 'Năm ' + timeUnit;
                }
            });
            setTimer(timerNew);

            const totalRevenueNew = data.result.map((item) => item[1]);
            setTotalRevenue(totalRevenueNew);
            setSummary(data.summary);
        }
    }
    const fetchExportFile = async () => {
        try {
            const response = await fetch('/api/revenue/exportCSV', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ startDate: timerRequest.startDate, endDate: timerRequest.endDate })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'export.csv';
                a.click();
                URL.revokeObjectURL(url);
            } else {
                console.error('Error:', response.status);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <>
            <div className='revenue-page'>
                <h2 className="title-admin mb-0" style={{ fontSize: '24px', fontWeight: '600', color: '#2d3748', marginLeft: '0', paddingLeft: '0', marginBottom: '30px', paddingBottom: '20px' }}>Quản lý Doanh thu
                    <style>{`.title-admin::after { display: none !important; }`}</style> </h2>
                <div className='revenue-container'>
                    <div className='filter-box'>
                        <form onSubmit={(event) => fetchStatistical(event)}>
                            <div className='filter-grid'>
                                <Form.Group className='form-group'>
                                    <Form.Label>Từ ngày</Form.Label>
                                    <Form.Control onChange={(event) => setTimerRequest({ ...timerRequest, startDate: event.target.value })}
                                        type="date" name='startDate'
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className='form-group'>
                                    <Form.Label>Đến ngày</Form.Label>
                                    <Form.Control onChange={(event) => setTimerRequest({ ...timerRequest, endDate: event.target.value })}
                                        type="date" name='endDate' required
                                    />
                                </Form.Group>

                                <Form.Group className='form-group'>
                                    <Form.Label>Loại thống kê</Form.Label>
                                    <Form.Select onChange={(event) => setTimerRequest({ ...timerRequest, typeRevenue: event.target.value })}
                                        name="typeTime" required>
                                        <option value="">Chọn loại</option>
                                        <option value="Date">Theo ngày</option>
                                        <option value="Month">Theo tháng</option>
                                        <option value="Year">Theo năm</option>
                                    </Form.Select>
                                </Form.Group>

                                <div className='filter-actions'>
                                    <button className='btn btn-revenue'>Thống kê</button>
                                    <button type="button" className='btn btn-export' onClick={fetchExportFile}>Xuất Excel</button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {summary && (
                        <div className='stats-section'>
                            <h5>Thống kê số liệu</h5>
                            <div className='table-responsive'>
                                <table className='table table-revenue'>
                                    <thead>
                                        <tr>
                                            <th>Tổng doanh thu</th>
                                            <th>Tổng đơn hàng</th>
                                            <th>Giá trị trung bình/đơn</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className='text-success font-weight-bold'>{summary.totalRevenue.toLocaleString()} đ</td>
                                            <td>{summary.totalOrders} đơn</td>
                                            <td>{summary.avgOrderValue.toLocaleString()} đ</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className='chart-section'>
                        <h5>Biến động doanh thu</h5>
                        <div className='chart-container'>
                            <Chart type='bar' data={data} options={options} height={350} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Charts;