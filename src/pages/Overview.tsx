import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Table, Tag, Button, Progress } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../stores';
import { CERTIFICATE_TYPE_LABELS, type Certificate } from '../types';
import { formatDate, getDaysUntilExpiry } from '../utils';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  ArrowRight,
  BarChart3,
  ClipboardList,
} from 'lucide-react';

const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { certificates, stores, updateCertificatesStatus } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    updateCertificatesStatus();
    setMounted(true);
  }, []);

  const stats = {
    total: certificates.length,
    normal: certificates.filter((c) => c.status === 'normal').length,
    expiring: certificates.filter((c) => c.status === 'expiring').length,
    expired: certificates.filter((c) => c.status === 'expired').length,
  };

  const expiringCertificates = certificates
    .filter((c) => c.status === 'expiring' || c.status === 'expired')
    .sort((a, b) => getDaysUntilExpiry(a.endDate) - getDaysUntilExpiry(b.endDate))
    .slice(0, 5);

  const byTypeOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: [
          { value: certificates.filter((c) => c.type === 'business_license').length, name: '营业执照', itemStyle: { color: '#3b82f6' } },
          { value: certificates.filter((c) => c.type === 'qualification').length, name: '人员资格证', itemStyle: { color: '#10b981' } },
          { value: certificates.filter((c) => c.type === 'inspection').length, name: '设备检验证', itemStyle: { color: '#f59e0b' } },
        ],
      },
    ],
  };

  const byStatusOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: ['正常', '即将到期', '已过期'] },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: [
          { value: stats.normal, itemStyle: { color: '#10b981' } },
          { value: stats.expiring, itemStyle: { color: '#f59e0b' } },
          { value: stats.expired, itemStyle: { color: '#ef4444' } },
        ],
        barWidth: '50%',
      },
    ],
  };

  const columns = [
    {
      title: '证照编号',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => (
        <a onClick={() => navigate('/certificates')} className="text-blue-600 hover:underline">
          {text}
        </a>
      ),
    },
    {
      title: '持有人',
      dataIndex: 'holder',
      key: 'holder',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: Certificate['type']) => CERTIFICATE_TYPE_LABELS[type],
    },
    {
      title: '到期日期',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date: string) => {
        const days = getDaysUntilExpiry(date);
        return (
          <span className={days < 0 ? 'text-red-600' : days <= 30 ? 'text-yellow-600' : ''}>
            {formatDate(date)}
          </span>
        );
      },
    },
    {
      title: '剩余天数',
      key: 'daysLeft',
      render: (_: unknown, record: Certificate) => {
        const days = getDaysUntilExpiry(record.endDate);
        return (
          <Tag color={days < 0 ? 'red' : days <= 30 ? 'orange' : 'green'}>
            {days < 0 ? `已过期${Math.abs(days)}天` : `${days}天`}
          </Tag>
        );
      },
    },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">证照总览</h1>
        <Button type="primary" onClick={() => navigate('/certificates')}>
          前往证照库
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">正常证照</p>
                <p className="text-4xl font-bold mt-2">{stats.normal}</p>
                <p className="text-sm text-green-100 mt-1">占比 {((stats.normal / stats.total) * 100).toFixed(1)}%</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-200" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100">即将到期</p>
                <p className="text-4xl font-bold mt-2">{stats.expiring}</p>
                <p className="text-sm text-yellow-100 mt-1">30天内到期</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-yellow-200" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100">已过期</p>
                <p className="text-4xl font-bold mt-2">{stats.expired}</p>
                <p className="text-sm text-red-100 mt-1">需要续期</p>
              </div>
              <XCircle className="w-12 h-12 text-red-200" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">证照总数</p>
                <p className="text-4xl font-bold mt-2">{stats.total}</p>
                <p className="text-sm text-blue-100 mt-1">全部证照</p>
              </div>
              <FileText className="w-12 h-12 text-blue-200" />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="证照状态分布" className="h-full">
            <ReactECharts option={byStatusOption} style={{ height: '300px' }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="证照类型分布" className="h-full">
            <ReactECharts option={byTypeOption} style={{ height: '300px' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="需要关注的证照"
        extra={
          <Button type="link" onClick={() => navigate('/certificates')}>
            查看全部 <ArrowRight className="inline w-4 h-4 ml-1" />
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={expiringCertificates}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="门店证照分布">
            <div className="space-y-4">
              {stores.map((store) => {
                const storeCerts = certificates.filter((c) => c.stores.includes(store.id));
                const normalCerts = storeCerts.filter((c) => c.status === 'normal').length;
                const expiringCerts = storeCerts.filter((c) => c.status === 'expiring').length;
                const expiredCerts = storeCerts.filter((c) => c.status === 'expired').length;
                const total = storeCerts.length;

                return (
                  <div key={store.id}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{store.name}</span>
                      <span className="text-sm text-gray-500">
                        正常 {normalCerts} / 即将到期 {expiringCerts} / 已过期 {expiredCerts}
                      </span>
                    </div>
                    <Progress
                      percent={total > 0 ? (normalCerts / total) * 100 : 0}
                      success={{ percent: (normalCerts / total) * 100 }}
                      trailColor="#f3f4f6"
                      strokeColor="#10b981"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="快速操作">
            <div className="grid grid-cols-2 gap-4">
              <Button
                size="large"
                icon={<FileText className="w-5 h-5" />}
                onClick={() => navigate('/certificates')}
                block
              >
                证照库管理
              </Button>
              <Button
                size="large"
                icon={<AlertTriangle className="w-5 h-5" />}
                onClick={() => navigate('/reminders')}
                block
              >
                提醒设置
              </Button>
              <Button
                size="large"
                icon={<BarChart3 className="w-5 h-5" />}
                onClick={() => navigate('/statistics')}
                block
              >
                数据统计
              </Button>
              <Button
                size="large"
                icon={<ClipboardList className="w-5 h-5" />}
                onClick={() => navigate('/records')}
                block
              >
                办理记录
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Overview;
