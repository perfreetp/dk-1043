import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Table, Input, Select, Button, Tag, Modal, message, Space, Statistic, Timeline } from 'antd';
import { Search, Download, Printer, RefreshCw, Eye, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../stores';
import { CERTIFICATE_TYPE_LABELS, CERTIFICATE_STATUS_LABELS, PROCESS_RESULT_LABELS, type Certificate, type CertificateStatus } from '../types';
import { formatDate, getDaysUntilExpiry } from '../utils';
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
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

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

  const storeDashboard = useMemo(() => {
    if (!selectedStoreId) return null;
    
    const storeCerts = certificates.filter((cert) => cert.stores.includes(selectedStoreId));
    const storeCertIds = new Set(storeCerts.map((c) => c.id));
    
    const expiringCerts = storeCerts.filter((c) => {
      if (c.status === 'expiring') return true;
      const days = getDaysUntilExpiry(c.endDate);
      return days > 0 && days <= 30;
    });
    
    const storeRecords = records
      .filter((r) => storeCertIds.has(r.certificateId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const recentRecords = storeRecords.slice(0, 10);
    
    const recentFees = storeRecords
      .filter((r) => r.completeTime)
      .slice(0, 20);
    
    const totalActualFee = recentFees.reduce((sum, r) => sum + ((r.actualFee ?? r.estimatedFee) || 0), 0);
    const totalEstimatedFee = recentFees.reduce((sum, r) => sum + (r.estimatedFee || 0), 0);
    
    return {
      totalCerts: storeCerts.length,
      expiringCerts: expiringCerts.length,
      expiredCerts: storeCerts.filter((c) => c.status === 'expired').length,
      normalCerts: storeCerts.filter((c) => c.status === 'normal').length,
      recentRecords,
      totalActualFee,
      totalEstimatedFee,
      hasActualFee: recentFees.some((r) => r.actualFee !== undefined),
    };
  }, [selectedStoreId, certificates, records]);

  const feeStatisticsByStore = useMemo(() => {
    return stores.map((store) => {
      const storeCertIds = new Set(certificates.filter((c) => c.stores.includes(store.id)).map((c) => c.id));
      const storeRecords = records.filter((r) => storeCertIds.has(r.certificateId) && r.completeTime);
      
      const actualFee = storeRecords.reduce((sum, r) => sum + ((r.actualFee ?? r.estimatedFee) || 0), 0);
      const estimatedFee = storeRecords.reduce((sum, r) => sum + (r.estimatedFee || 0), 0);
      
      return {
        storeId: store.id,
        storeName: store.name,
        actualFee,
        estimatedFee,
        recordCount: storeRecords.length,
      };
    });
  }, [stores, certificates, records]);

  const feeStatisticsByMonth = useMemo(() => {
    const grouped = records
      .filter((r) => r.completeTime)
      .reduce<Record<string, typeof records>>((acc, record) => {
        const month = record.completeTime!.substring(0, 7);
        if (!acc[month]) acc[month] = [];
        acc[month].push(record);
        return acc;
      }, {});
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, recs]) => ({
        month,
        actualFee: recs.reduce((sum, r) => sum + ((r.actualFee ?? r.estimatedFee) || 0), 0),
        estimatedFee: recs.reduce((sum, r) => sum + (r.estimatedFee || 0), 0),
        recordCount: recs.length,
      }));
  }, [records]);

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
        最近办理结果: latestRecord ? PROCESS_RESULT_LABELS[latestRecord.result] : '-',
        预计费用: latestRecord ? latestRecord.estimatedFee : undefined,
        实际费用: latestRecord?.actualFee,
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

      <Card 
        title={
          <div className="flex items-center gap-4">
            <span>门店台账看板</span>
            <Select
              placeholder="选择门店查看台账"
              value={selectedStoreId || undefined}
              onChange={(value) => setSelectedStoreId(value)}
              allowClear
              style={{ width: 200 }}
            >
              {stores.map((store) => (
                <Select.Option key={store.id} value={store.id}>
                  {store.name}
                </Select.Option>
              ))}
            </Select>
          </div>
        }
        extra={
          selectedStoreId && (
            <Button size="small" onClick={() => handleExportExcel(selectedStoreId)}>
              导出该门店台账
            </Button>
          )
        }
      >
        {selectedStoreId && storeDashboard ? (
          <div className="space-y-6">
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="证照总数"
                    value={storeDashboard.totalCerts}
                    prefix={<FileText className="w-5 h-5 text-blue-500" />}
                    valueStyle={{ color: '#3b82f6' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="即将到期"
                    value={storeDashboard.expiringCerts}
                    prefix={<AlertTriangle className="w-5 h-5 text-orange-500" />}
                    valueStyle={{ color: '#f59e0b' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="已过期"
                    value={storeDashboard.expiredCerts}
                    prefix={<XCircle className="w-5 h-5 text-red-500" />}
                    valueStyle={{ color: '#ef4444' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="正常"
                    value={storeDashboard.normalCerts}
                    prefix={<CheckCircle className="w-5 h-5 text-green-500" />}
                    valueStyle={{ color: '#10b981' }}
                  />
                </Card>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="最近办理费用合计">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-gray-500 text-sm">实际费用</div>
                      <div className="text-2xl font-bold text-green-600">
                        ¥{storeDashboard.totalActualFee.toFixed(2)}
                      </div>
                    </div>
                    {storeDashboard.totalEstimatedFee !== storeDashboard.totalActualFee && (
                      <div className="text-gray-400">
                        <span className="text-sm">预计费用 </span>
                        <span className="line-through">¥{storeDashboard.totalEstimatedFee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="最近办理记录">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-gray-500 text-sm">办理中</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {storeDashboard.recentRecords.filter((r) => r.result === 'processing').length}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">已通过</div>
                      <div className="text-2xl font-bold text-green-600">
                        {storeDashboard.recentRecords.filter((r) => r.result === 'approved').length}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">未通过</div>
                      <div className="text-2xl font-bold text-red-600">
                        {storeDashboard.recentRecords.filter((r) => r.result === 'rejected').length}
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
            
            <Card size="small" title="最近续办动态">
              {storeDashboard.recentRecords.length > 0 ? (
                <Timeline
                  items={storeDashboard.recentRecords.map((record) => {
                    const cert = certificates.find((c) => c.id === record.certificateId);
                    return {
                      color: record.result === 'approved' ? 'green' : record.result === 'rejected' ? 'red' : 'blue',
                      children: (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{cert?.code || '未知证照'}</span>
                          <Tag color={record.result === 'approved' ? 'success' : record.result === 'rejected' ? 'error' : 'processing'}>
                            {PROCESS_RESULT_LABELS[record.result]}
                          </Tag>
                          <span className="text-gray-400">
                            {formatDate(record.createdAt)}
                          </span>
                          {record.actualFee !== undefined ? (
                            <span className="text-green-600">¥{record.actualFee.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">¥{record.estimatedFee.toFixed(2)}(预)</span>
                          )}
                        </div>
                      ),
                    };
                  })}
                />
              ) : (
                <div className="text-center text-gray-400 py-4">
                  暂无办理记录
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            请选择门店查看台账看板
          </div>
        )}
      </Card>

      <Card title="费用汇总统计（按门店）">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">门店</th>
              <th className="text-center py-2">办理记录数</th>
              <th className="text-right py-2">预计费用</th>
              <th className="text-right py-2">实际费用</th>
            </tr>
          </thead>
          <tbody>
            {feeStatisticsByStore.map((item) => (
              <tr key={item.storeId} className="border-b">
                <td className="py-2">{item.storeName}</td>
                <td className="text-center">{item.recordCount}</td>
                <td className="text-right text-gray-500">¥{item.estimatedFee.toFixed(2)}</td>
                <td className="text-right text-green-600 font-medium">¥{item.actualFee.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="py-2">合计</td>
              <td className="text-center">{feeStatisticsByStore.reduce((sum, item) => sum + item.recordCount, 0)}</td>
              <td className="text-right text-gray-500">¥{feeStatisticsByStore.reduce((sum, item) => sum + item.estimatedFee, 0).toFixed(2)}</td>
              <td className="text-right text-green-600">¥{feeStatisticsByStore.reduce((sum, item) => sum + item.actualFee, 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <Card title="费用汇总统计（按月份）">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">月份</th>
              <th className="text-center py-2">办理记录数</th>
              <th className="text-right py-2">预计费用</th>
              <th className="text-right py-2">实际费用</th>
            </tr>
          </thead>
          <tbody>
            {feeStatisticsByMonth.map((item) => (
              <tr key={item.month} className="border-b">
                <td className="py-2">{item.month}</td>
                <td className="text-center">{item.recordCount}</td>
                <td className="text-right text-gray-500">¥{item.estimatedFee.toFixed(2)}</td>
                <td className="text-right text-green-600 font-medium">¥{item.actualFee.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

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
          提示：导出台账包含证照基本信息、最近办理结果和费用；实际费用未填写时按预计费用统计；一个证照适用多个门店时，在对应门店台账中都会出现
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
