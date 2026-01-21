import { useState } from 'react';
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
    const [timerRequest, setTimerRequest] = useState({startDate: '', endDate: '', typeRevenue: ''});
    const [timer, setTimer] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState([]);

    const data = {
        labels: timer || [],
        datasets: [
            {
                label: 'Doanh thu',
                data: totalRevenue || [],
                backgroundColor: 'rgba(26, 192, 115, 1)',
                borderWidth: .5,
                type: 'bar'
            },
            {
                label: 'Line',
                fill: false,
                data: totalRevenue || [],
                backgroundColor: 'rgba(251, 140, 9, 1)',
                borderColor: 'rgba(251, 140, 9, 1)',
                borderWidth: 2,
                type: 'line'
            },
        ],
    };
    
    const fetchStatistical = async(event)=>{
        event.preventDefault();

        const response = await fetch('/api/revenue/calc', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ startDate: timerRequest.startDate, endDate: timerRequest.endDate, typeRevenue: timerRequest.typeRevenue })
        })
        const revenue = await response.json();

        if(revenue && revenue.result.length > 0){

            const timerNew = revenue.result.map((item) => {
                let timeUnit;
                if(revenue.typeRevenue === 'Date'){
                    timeUnit = new Date(item[0]).getDate();
                    return 'Ngày ' + timeUnit;
                } else if(revenue.typeRevenue === 'Month') {
                    timeUnit = new Date(item[0]).getMonth();
                    return 'Tháng ' + timeUnit;
                } else {
                    timeUnit = new Date(item[0]).getFullYear();
                    return 'Năm ' + timeUnit;
                }
            });
            setTimer(timerNew);

            const totalRevenueNew = revenue.result.map((item) => item[1]);
            setTotalRevenue(totalRevenueNew);
        }
    }

    // const fetchExportFile = async () => {
    //     const response = await fetch('/api/revenue/exportCSV',{
    //         method: 'post',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify({ startDate: timerRequest.startDate, endDate: timerRequest.endDate })
    //     });
    //     const exportFile = await response.json();
    //     console.log(exportFile);
    // }
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
            console.log(blob);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            console.log(url);
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

    // const options = {
    //     responsive: true,
    //     plugins: {
    //         legend: {
    //             position: 'bottom',
    //         },
    //         title: {
    //             display: true,
    //             text: 'Doanh thus',
    //         },
    //     },
    // };

    return (
        <>
            <div className='chart'>
                <h3 className="title-admin">Thống kê doanh thu</h3>

                <div className='chart-box'>
                    <form onSubmit={(event)=>fetchStatistical(event)}>
                        <div className='chart-time'>
                            <div className='chart-time__group'>
                                <Form.Group className='form-group'>
                                    <span>Thời gian bắt đầu: </span>
                                    <Form.Control onChange={(event)=>setTimerRequest({...timerRequest, startDate: event.target.value})} 
                                        type="date" name='startDate' 
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className='form-group'>
                                    <span>Thời gian kết thúc: </span>
                                    <Form.Control onChange={(event)=>setTimerRequest({...timerRequest, endDate: event.target.value})} 
                                        type="date" name='endDate' required
                                    />
                                </Form.Group>
                            </div>

                            <div className='chart-time__group'>
                                <Form.Group className='form-group'>
                                    <span>Loại thời gian: </span>
                                    <Form.Select onChange={(event)=>setTimerRequest({...timerRequest, typeRevenue: event.target.value})} 
                                        name="typeTime" required>
                                        <option value="">Chọn thời gian</option>
                                        <option value="Date">Ngày</option>
                                        <option value="Month">Tháng</option>
                                        <option value="Year">Năm</option>
                                    </Form.Select>
                                </Form.Group>
                                <button className='btn btn-revenue'>Thống kê</button>
                            </div>
                        </div>
                    </form>
                    <button className='btn btn-export' onClick={fetchExportFile}>Xuất file</button>
                    <Chart type='bar' data={data} />
                </div>
            </div>
        </>
    );
}

export default Charts;