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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

function HomeStaff() {
  const [stats, setStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);

  const loadCharts = async () => {
  try {
    const res1 = await axios.get("/api/dashboard/top-products");
    const res2 = await axios.get("/api/dashboard/category-sales");

    setTopProducts(res1.data);
    setCategorySales(res2.data);

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
}, []);

  if (!stats) {
    return (
      <div className="loading">
        <Spinner animation="border"/>
      </div>
    );
  }

  return (

    <Container fluid className="staff-dashboard">

      <Row>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <h6>Tổng món ăn</h6>
              <h2>{stats.totalProducts}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <h6>Khách hàng mới</h6>
              <h2>x/{stats.totalCustomers}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <h6>Đơn hoàn thành</h6>
              <h2>
                {stats.successOrders} / {stats.totalOrders}
              </h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <h6>Doanh thu tháng</h6>
              <h2>
                {stats.revenueMonth?.toLocaleString()} đ
              </h2>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      <Row className="mt-3">
        {/* TOP SẢN PHẨM */}
        <Col md={6}>
          <Card className="chart-card">
            <Card.Body>
              <h5>Top 10 món bán chạy</h5>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={220}>
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
            <Card.Body>
              <h5>Danh mục bán chạy</h5>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={220}>
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