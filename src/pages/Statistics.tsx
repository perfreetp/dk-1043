import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Table, Input, Select, Button, Tag, Modal, message, Space } from 'antd';
import { Search, Download, Printer, RefreshCw, Eye } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../stores';
import { CERTIFICATE_TYPE_LABELS, CERTIFICATE_STATUS_LABELS, type Certificate, type CertificateStatus } from '../types';
import { formatDate } from '../utils';
import * as XLSX from 'xlsx';

const Statistics: React.FC = () => {
  const { certificates, stores, records, batchUpdateCertificatesStatus } = useStore();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<CertificateStatus>('' as CertificateStatus);
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [exportStoreFilter, setExportStoreFilter] = useState<string>('');
  const [exportTypeFilter, setExportTypeFilter] = useState<string>('');
  const [exportStatusFilter, setExportStatusFilter] = useState<CertificateStatus>('' as CertificateStatus);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<string>('');

  const filteredCertificates = useMemo(() => {
    return certificates.filter((cert) => {
      const matchesSearch =
        !searchText ||
        cert.code.toLowerCase().includes(searchText.toLowerCase()) ||
        cert.holder.toLowerCase().includes(searchText.toLowerCase()) ||
        cert.issuer.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = !typeFilter || cert.type === typeFilter;
      const matchesStatus = !statusFilter || cert.status === statusFilter;
      const matchesStore = !storeFilter || cert.stores.includes(storeFilter);
      return matchesSearch && matchesType && matchesStatus && matchesStore;
    });
  }, [certificates, searchText, typeFilter, statusFilter, storeFilter]);

  const getCertificateRecords = (certificateId: string) => {
    return records
      .filter((r) => r.certificateId === certificateId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getLatestRecord = (certificateId: string) => {
    const certRecords = getCertificateRecords(certificateId);
    return certRecords.length > 0 ? certRecords[0] : null;
  };

  const statisticsByStore = useMemo(() => {
    return stores.map((store) => {
      const storeCerts = certificates.filter((cert) => cert.stores.includes(store.id));
      return {
        storeId: store.id,
        storeName: store.name,
        total: storeCerts.length,
        normal: storeCerts.filter((c) => c.status === 'normal').length,
        expiring: storeCerts.filter((c) => c.status === 'expiring').length,
        expired: storeCerts.filter((c) => c.status === 'expired').length,
      };
    });
  }, [certificates, stores]);

  const statisticsByType = useMemo(() => {
    const grouped = certificates.reduce<Record<string, Certificate[]>>((acc, cert) => {
      if (!acc[cert.type]) acc[cert.type] = [];
      acc[cert.type].push(cert);
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([type, certs]) => ({
      type,
      label: CERTIFICATE_TYPE_LABELS[type as keyof typeof CERTIFICATE_TYPE_LABELS],
      total: certs.length,
      normal: certs.filter((c) => c.status === 'normal').length,
      expiring: certs.filter((c) => c.status === 'expiring').length,
      expired: certs.filter((c) => c.status === 'expired').length,
    }));
  }, [certificates]);

  const statisticsByMonth = useMemo(() => {
    const grouped = certificates.reduce<Record<string, Certificate[]>>((acc, cert) => {
      const month = cert.endDate.substring(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(cert);
      return acc;
    }, {});
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, certs]) => ({
        month,
        total: certs.length,
        expiring: certs.filter((c) => c.status === 'expiring' || c.status === 'expired').length,
      }));
  }, [certificates]);

  const byTypeOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: statisticsByType.map((item, index) => ({
          value: item.total,
          name: item.label,
          itemStyle: { color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4] },
        })),
      },
    ],
  };

  const byMonthOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['到期证照数'] },
    xAxis: {
      type: 'category',
      data: statisticsByMonth.map((item) => item.month),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '到期证照数',
        type: 'bar',
        data: statisticsByMonth.map((item) => item.expiring),
        itemStyle: { color: '#f59e0b' },
      },
    ],
  };

  const columns = [
    {
      title: '证照编号',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '证照类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: Certificate['type']) => CERTIFICATE_TYPE_LABELS[type],
    },
    {
      title: '持有人',
      dataIndex: 'holder',
      key: 'holder',
      width: 180,
    },
    {
      title: '有效期',
      key: 'validity',
      width: 220,
      render: (_: unknown, record: Certificate) => (
        <span>
          {formatDate(record.startDate)} 至 {formatDate(record.endDate)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: CertificateStatus) => (
        <Tag color={status === 'normal' ? 'green' : status === 'expiring' ? 'orange' : 'red'}>
          {CERTIFICATE_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Certificate) => (
        <Button
          type="link"
          icon={<Eye className="w-4 h-4" />}
          onClick={() => {
            setPreviewFile(record.attachment || '');
            setIsPreviewOpen(true);
          }}
        >
          预览附件
        </Button>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const handleBatchUpdateStatus = (newStatus: CertificateStatus) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要更新的证照');
      return;
    }
    batchUpdateCertificatesStatus(selectedRowKeys as string[], newStatus);
    message.success(`已更新 ${selectedRowKeys.length} 条记录的状态为 ${CERTIFICATE_STATUS_LABELS[newStatus]}`);
    setSelectedRowKeys([]);
  };

  const handleExportExcel = (storeId?: string, type?: string, status?: CertificateStatus) => {
    let exportData = certificates;
    
    if (storeId) {
      exportData = exportData.filter((cert) => cert.stores.includes(storeId));
    }
    if (type) {
      exportData = exportData.filter((cert) => cert.type === type);
    }
    if (status) {
      exportData = exportData.filter((cert) => cert.status === status);
    }
    
    const storeName = storeId ? stores.find((s) => s.id === storeId)?.name : '全部';
    
    const data = exportData.map((cert) => {
      const latestRecord = getLatestRecord(cert.id);
      return {
        证照编号: cert.code,
        证照类型: CERTIFICATE_TYPE_LABELS[cert.type],
        持有人: cert.holder,
        发证单位: cert.issuer,
        有效期起: cert.startDate,
        有效期止: cert.endDate,
        适用门店: cert.stores.map((id) => stores.find((s) => s.id === id)?.name).join(', '),
        状态: CERTIFICATE_STATUS_LABELS[cert.status],
        最近办理结果: latestRecord ? (latestRecord.result === 'approved' ? '已通过' : latestRecord.result === 'rejected' ? '未通过' : '受理中') : '-',
        最近办理费用: latestRecord ? `¥${latestRecord.fee.toFixed(2)}` : '-',
        备注: cert.remark || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${storeName}证照台账`);
    XLSX.writeFile(wb, `${storeName}证照台账_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success(`已导出 ${storeName} 证照台账，共 ${data.length} 条记录`);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-table');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>证照台账</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f3f4f6; }
                h1 { text-align: center; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <h1>证照台账</h1>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">统计分析</h1>
        <Space>
          <Button icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            打印台账
          </Button>
          <Button type="primary" icon={<Download className="w-4 h-4" />} onClick={() => handleExportExcel()}>
            导出清单
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="按门店统计">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">门店</th>
                  <th className="text-center py-2">总数</th>
                  <th className="text-center py-2">正常</th>
                  <th className="text-center py-2">即将到期</th>
                  <th className="text-center py-2">已过期</th>
                </tr>
              </thead>
              <tbody>
                {statisticsByStore.map((item) => (
                  <tr key={item.storeId} className="border-b">
                    <td className="py-2">{item.storeName}</td>
                    <td className="text-center">{item.total}</td>
                    <td className="text-center text-green-600">{item.normal}</td>
                    <td className="text-center text-yellow-600">{item.expiring}</td>
                    <td className="text-center text-red-600">{item.expired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="按类型统计">
            <ReactECharts option={byTypeOption} style={{ height: '300px' }} />
            <div className="mt-4">
              {statisticsByType.map((item) => (
                <div key={item.type} className="flex justify-between items-center py-2 border-b">
                  <span>{item.label}</span>
                  <div className="flex gap-4">
                    <Tag color="green">{item.normal} 正常</Tag>
                    <Tag color="orange">{item.expiring} 即将到期</Tag>
                    <Tag color="red">{item.expired} 已过期</Tag>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="月度到期趋势">
            <ReactECharts option={byMonthOption} style={{ height: '300px' }} />
          </Card>
        </Col>
      </Row>

      <Card title="按门店导出台账（支持筛选）">
        <div className="flex gap-4 items-center flex-wrap">
          <span className="text-gray-600">选择门店：</span>
          <Select
            placeholder="全部门店"
            value={exportStoreFilter || undefined}
            onChange={(value) => setExportStoreFilter(value)}
            allowClear
            style={{ width: 140 }}
          >
            {stores.map((store) => (
              <Select.Option key={store.id} value={store.id}>
                {store.name}
              </Select.Option>
            ))}
          </Select>
          <span className="text-gray-600">证照类型：</span>
          <Select
            placeholder="全部类型"
            value={exportTypeFilter || undefined}
            onChange={(value) => setExportTypeFilter(value)}
            allowClear
            style={{ width: 140 }}
          >
            {Object.entries(CERTIFICATE_TYPE_LABELS).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {String(label)}
              </Select.Option>
            ))}
          </Select>
          <span className="text-gray-600">证照状态：</span>
          <Select
            placeholder="全部状态"
            value={exportStatusFilter || undefined}
            onChange={(value) => setExportStatusFilter(value)}
            allowClear
            style={{ width: 120 }}
          >
            {Object.entries(CERTIFICATE_STATUS_LABELS).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {String(label)}
              </Select.Option>
            ))}
          </Select>
          <Button 
            icon={<Download className="w-4 h-4" />} 
            type="primary"
            onClick={() => handleExportExcel(
              exportStoreFilter || undefined, 
              exportTypeFilter || undefined, 
              exportStatusFilter || undefined
            )}
          >
            导出筛选台账
          </Button>
          <Button onClick={() => {
            setExportStoreFilter('');
            setExportTypeFilter('');
            setExportStatusFilter('' as CertificateStatus);
          }}>
            重置筛选
          </Button>
        </div>
        <div className="mt-3 text-sm text-gray-400">
          提示：导出台账包含证照基本信息、最近办理结果和费用；一个证照适用多个门店时，在对应门店台账中都会出现
        </div>
      </Card>

      <Card title="证照清单">
        <div className="mb-4 flex gap-4 flex-wrap">
          <Input
            placeholder="搜索证照编号、持有人、发证单位"
            prefix={<Search className="w-4 h-4 text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280 }}
          />
          <Select
            placeholder="证照类型"
            value={typeFilter || undefined}
            onChange={(value) => setTypeFilter(value)}
            allowClear
            style={{ width: 140 }}
          >
            {Object.entries(CERTIFICATE_TYPE_LABELS).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {String(label)}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="证照状态"
            value={statusFilter || undefined}
            onChange={(value) => setStatusFilter(value)}
            allowClear
            style={{ width: 120 }}
          >
            {Object.entries(CERTIFICATE_STATUS_LABELS).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {String(label)}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="适用门店"
            value={storeFilter || undefined}
            onChange={(value) => setStoreFilter(value)}
            allowClear
            style={{ width: 140 }}
          >
            {stores.map((store) => (
              <Select.Option key={store.id} value={store.id}>
                {store.name}
              </Select.Option>
            ))}
          </Select>
          <Button
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => {
              setSearchText('');
              setTypeFilter('');
              setStatusFilter('' as CertificateStatus);
              setStoreFilter('');
            }}
          >
            重置
          </Button>
        </div>

        <div className="mb-4 flex gap-2 items-center flex-wrap">
          <span className="text-gray-600">批量操作：</span>
          <Button size="small" onClick={() => handleBatchUpdateStatus('normal')}>
            设为正常
          </Button>
          <Button size="small" onClick={() => handleBatchUpdateStatus('expiring')}>
            设为即将到期
          </Button>
          <Button size="small" onClick={() => handleBatchUpdateStatus('expired')}>
            设为已过期
          </Button>
          <span className="text-gray-500 ml-4">
            已选择 {selectedRowKeys.length} 项
          </span>
        </div>

        <div id="printable-table">
          <Table
            columns={columns}
            dataSource={filteredCertificates}
            rowKey="id"
            rowSelection={rowSelection}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </div>
      </Card>

      <Modal
        title="附件预览"
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        footer={null}
        width={800}
      >
        <div className="py-8 text-center text-gray-500">
          {previewFile ? (
            <div>
              <img src={previewFile} alt="附件预览" className="max-w-full" />
            </div>
          ) : (
            <div>
              <Eye className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p>暂无附件</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Statistics;
