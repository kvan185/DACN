import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import axios from "axios";

import "./homeStaff.scss";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

function HomeStaff() {
  const [stats, setStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);

  const loadCharts = async () => {
    try {
      const res1 = await axios.get("/api/dashboard/top-products");
      const res4 = await axios.get("/api/dashboard/category-sales");
      const res5 = await axios.get("/api/dashboard/revenue-trend");

      setTopProducts(res1.data);
      setCategorySales(res4.data);
      setRevenueTrend(res5.data);

    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await axios.get("/api/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      console.error(err);

    }

  };

  useEffect(() => {
    loadStats();
    loadCharts();

    // Hide global scrollbar for the dashboard
    document.body.classList.add('hide-scrollbar');
    return () => {
      document.body.classList.remove('hide-scrollbar');
    };
  }, []);

  if (!stats) {
    return (
      <div className="loading">
        <Spinner animation="border" />
      </div>
    );
  }

  return (

    <Container fluid className="staff-dashboard">

      <Row className="g-3">
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <h5>Tổng món ăn</h5>
              <h2>{stats.totalProducts}</h2>
              <div className="text-muted small mt-1">Sản phẩm hiện có</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <h5>Khách hàng mới</h5>
              <h2>{stats.newCustomersMonth}</h2>
              <div className="text-muted small mt-1">Trong tháng này</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <h5>Đơn hoàn thành</h5>
              <h2>{stats.paidOrdersCount}</h2>
              <div className="text-muted small mt-1">Tổng đơn đã thanh toán</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <h5>Doanh thu</h5>
              <h2>
                {stats.totalRevenuePaid?.toLocaleString()} đ
              </h2>
              <div className="text-muted small mt-1">Tổng doanh thu thực tế</div>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      <Row className="mt-3 g-3">
        {/* TOP SẢN PHẨM */}
        <Col md={6}>
          <Card className="chart-card">
            <Card.Body className="p-3">
              <h5 className="mt-0 mb-3">Top món bán chạy</h5>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topProducts} fill="#39a28fa1">
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalSold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* DANH MỤC BÁN CHẠY */}
        <Col md={6}>
          <Card className="chart-card">
            <Card.Body className="p-3">
              <h5 className="mt-0 mb-3">Danh mục bán chạy</h5>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categorySales} fill="#ab9150a1">
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalSold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>


  );

}

export default HomeStaff