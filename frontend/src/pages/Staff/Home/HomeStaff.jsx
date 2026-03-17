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
  const [topCustomers, setTopCustomers] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);

  const loadCharts = async () => {
  try {
    const res1 = await axios.get("/api/dashboard/top-products");
    const res2 = await axios.get("/api/dashboard/top-customers");
    const res3 = await axios.get("/api/dashboard/products-by-category");
    const res4 = await axios.get("/api/dashboard/category-sales");
    const res5 = await axios.get("/api/dashboard/revenue-trend");

    setTopProducts(res1.data);
    setTopCustomers(res2.data);
    setCategoryProducts(res3.data);
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

<Row className="mb-3">
  <h2 className="dashboard-title">Biểu đồ phân tích</h2>
</Row>
<Row className="mt-4">
  {/* TOP SẢN PHẨM */}
  <Col md={6}>
    <Card className="chart-card">
      <Card.Body>
        <h5>Top 10 món bán chạy</h5>
        <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topProducts} fill="#39a28fa1">
            <XAxis dataKey="name" hide/>
            <YAxis />
            <Tooltip />
            <Bar dataKey="totalSold" />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  </Col>

  {/* TOP KHÁCH HÀNG */}
  <Col md={6}>
    <Card className="chart-card">
      <Card.Body>
        <h5>Top khách hàng thân thiết </h5>
        <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topCustomers} fill="#46a4dfa1">
            <XAxis dataKey="name" hide/>
            <YAxis />
            <Tooltip />
            <Bar dataKey="totalSpent" />
          </BarChart>
        </ResponsiveContainer>
</div>
      </Card.Body>
    </Card>
  </Col>
</Row>


<Row className="mt-4">

 <Col md={4}>
  <Card className="chart-card">
    <Card.Body>
      <h5>Số món theo danh mục</h5>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={categoryProducts}
              dataKey="count"
              nameKey="name"
              outerRadius={100}
              label = {false}
              labelLine={false}   
            >
              {categoryProducts.map((entry, index) => (
                <Cell
                  key={index}
                  fill={[
                    "#87d689",
                    "#73befc",
                    "#f8be68",
                    "#e286f2",
                    "#67e7cf",
                    "#f989a1",
                  ][index % 7]} 
                />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

    </Card.Body>
  </Card>
</Col>

  <Col md={8}>
    <Card className="chart-card">
      <Card.Body>
        <h5> Danh mục bán chạy</h5>
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

<Row className="mt-4">

  <Col md={12}>
    <Card className="chart-card">
      <Card.Body>
        <h5>Doanh thu tháng</h5>
        <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueTrend}>
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" />
          </LineChart>
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