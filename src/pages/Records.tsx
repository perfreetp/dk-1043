import React, { useState, useMemo } from 'react';
import { Table, Button, Input, Select, Modal, Form, DatePicker, message, Tag, Card, Row, Col, Descriptions, Timeline, Divider, Popconfirm, Upload } from 'antd';
import { Plus, Search, Eye, Edit2, History, Trash2, Paperclip } from 'lucide-react';
import dayjs from 'dayjs';
import type { UploadFile } from 'antd/es/upload/interface';
import { useStore } from '../stores';
import { PROCESS_TYPE_LABELS, PROCESS_RESULT_LABELS, type ProcessRecord, type ProcessType, type ProcessResult } from '../types';
import { formatDateTime } from '../utils';

const Records: React.FC = () => {
  const { records, certificates, addRecord, updateRecord, deleteRecord } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProcessRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<ProcessRecord | null>(null);
  const [historyCertificateId, setHistoryCertificateId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [processTypeFilter, setProcessTypeFilter] = useState<ProcessType | ''>('');
  const [resultFilter, setResultFilter] = useState<ProcessResult | ''>('');
  const [certificateFilter, setCertificateFilter] = useState<string>('');
  const [form] = Form.useForm();

  const filteredRecords = useMemo(() => {
    return records
      .filter((rec) => {
        const certificate = certificates.find((c) => c.id === rec.certificateId);
        const matchesSearch =
          !searchText ||
          (certificate?.code.toLowerCase().includes(searchText.toLowerCase()) ?? false) ||
          (certificate?.holder.toLowerCase().includes(searchText.toLowerCase()) ?? false);
        const matchesType = !processTypeFilter || rec.processType === processTypeFilter;
        const matchesResult = !resultFilter || rec.result === resultFilter;
        const matchesCertificate = !certificateFilter || rec.certificateId === certificateFilter;
        return matchesSearch && matchesType && matchesResult && matchesCertificate;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [records, certificates, searchText, processTypeFilter, resultFilter, certificateFilter]);

  const certificateHistory = useMemo(() => {
    if (!historyCertificateId) return [];
    return records
      .filter((rec) => rec.certificateId === historyCertificateId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [records, historyCertificateId]);

  const statistics = useMemo(() => {
    const totalFee = records.reduce((sum, r) => sum + ((r.actualFee ?? r.estimatedFee) || 0), 0);
    return {
      total: records.length,
      approved: records.filter((r) => r.result === 'approved').length,
      rejected: records.filter((r) => r.result === 'rejected').length,
      processing: records.filter((r) => r.result === 'processing').length,
      totalFee,
    };
  }, [records]);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: ProcessRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      acceptTime: record.acceptTime ? dayjs(record.acceptTime) : null,
      completeTime: record.completeTime ? dayjs(record.completeTime) : null,
    });
    setIsModalOpen(true);
  };

  const handleView = (record: ProcessRecord) => {
    setViewRecord(record);
    setIsViewModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteRecord(id);
    message.success('删除成功');
  };

  const handleViewHistory = (certificateId: string) => {
    setHistoryCertificateId(certificateId);
    setIsHistoryModalOpen(true);
  };

  const handleAttachmentChange = (info: { file: UploadFile }) => {
    const file = info.file.originFileObj || info.file;
    if (file instanceof Blob) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        form.setFieldsValue({ attachment: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const acceptTime = values.acceptTime ? values.acceptTime.format('YYYY-MM-DD HH:mm') : '';
      const completeTime = values.completeTime ? values.completeTime.format('YYYY-MM-DD HH:mm') : '';
      
      const recordData = {
        certificateId: values.certificateId,
        processType: values.processType,
        materials: values.materials || [],
        acceptTime,
        estimatedFee: Number(values.estimatedFee) || 0,
        actualFee: values.actualFee ? Number(values.actualFee) : undefined,
        result: values.result,
        completeTime,
        attachment: values.attachment || '',
        remark: values.remark || '',
      };

      if (editingRecord) {
        updateRecord(editingRecord.id, recordData);
        message.success('更新成功');
      } else {
        addRecord(recordData);
        message.success('添加成功');
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getResultColor = (result: ProcessResult) => {
    switch (result) {
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      case 'processing':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getCertificateInfo = (certificateId: string) => {
    return certificates.find((c) => c.id === certificateId);
  };

  const getDisplayFee = (record: ProcessRecord) => {
    if (record.actualFee !== undefined && record.actualFee > 0) {
      return `¥${record.actualFee.toFixed(2)}`;
    }
    return `¥${record.estimatedFee.toFixed(2)} (预)`;
  };

  const columns = [
    {
      title: '关联证照',
      key: 'certificate',
      width: 200,
      render: (_: unknown, record: ProcessRecord) => {
        const cert = getCertificateInfo(record.certificateId);
        return cert ? (
          <div>
            <span className="text-blue-600">{cert.code}</span>
            <Button 
              type="link" 
              size="small" 
              icon={<History className="w-3 h-3" />}
              onClick={() => handleViewHistory(record.certificateId)}
              className="ml-2"
            >
              历史
            </Button>
          </div>
        ) : (
          <span className="text-gray-400">已删除</span>
        );
      },
    },
    {
      title: '持有人',
      key: 'holder',
      width: 150,
      render: (_: unknown, record: ProcessRecord) => {
        const cert = getCertificateInfo(record.certificateId);
        return cert?.holder || '-';
      },
    },
    {
      title: '办理类型',
      dataIndex: 'processType',
      key: 'processType',
      width: 100,
      render: (type: ProcessType) => PROCESS_TYPE_LABELS[type],
    },
    {
      title: '受理时间',
      dataIndex: 'acceptTime',
      key: 'acceptTime',
      width: 160,
      render: (time: string) => time || '-',
    },
    {
      title: '费用',
      dataIndex: 'fee',
      key: 'fee',
      width: 130,
      render: (_: unknown, record: ProcessRecord) => getDisplayFee(record),
    },
    {
      title: '办理结果',
      dataIndex: 'result',
      key: 'result',
      width: 100,
      render: (result: ProcessResult) => (
        <Tag color={getResultColor(result)}>
          {PROCESS_RESULT_LABELS[result]}
        </Tag>
      ),
    },
    {
      title: '完成时间',
      dataIndex: 'completeTime',
      key: 'completeTime',
      width: 160,
      render: (time: string) => time || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: ProcessRecord) => (
        <div className="flex gap-2">
          <Button
            type="link"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<Edit2 className="w-4 h-4" />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="是否确认删除此记录？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<Trash2 className="w-4 h-4" />}
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">办理记录</h1>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          添加记录
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{statistics.total}</div>
              <div className="text-sm text-gray-500 mt-1">总记录数</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{statistics.approved}</div>
              <div className="text-sm text-gray-500 mt-1">已通过</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{statistics.rejected}</div>
              <div className="text-sm text-gray-500 mt-1">未通过</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{statistics.processing}</div>
              <div className="text-sm text-gray-500 mt-1">受理中</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card size="small">
        <div className="flex gap-4 flex-wrap">
          <Input
            placeholder="搜索证照编号、持有人"
            prefix={<Search className="w-4 h-4 text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240 }}
          />
          <Select
            placeholder="按证照筛选"
            value={certificateFilter || undefined}
            onChange={(value) => setCertificateFilter(value)}
            allowClear
            style={{ width: 200 }}
          >
            {certificates.map((cert) => (
              <Select.Option key={cert.id} value={cert.id}>
                {cert.code} - {cert.holder}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="办理类型"
            value={processTypeFilter || undefined}
            onChange={(value) => setProcessTypeFilter(value)}
            allowClear
            style={{ width: 120 }}
          >
            {Object.entries(PROCESS_TYPE_LABELS).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {String(label)}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="办理结果"
            value={resultFilter || undefined}
            onChange={(value) => setResultFilter(value)}
            allowClear
            style={{ width: 120 }}
          >
            {Object.entries(PROCESS_RESULT_LABELS).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {String(label)}
              </Select.Option>
            ))}
          </Select>
          <div className="ml-auto text-gray-600">
            总费用(实际): <span className="font-bold text-lg">¥{statistics.totalFee.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      <div className="bg-white rounded-lg shadow-sm">
        <Table
          columns={columns}
          dataSource={filteredRecords}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </div>

      <Modal
        title={editingRecord ? '编辑办理记录' : '添加办理记录'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        width={700}
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="certificateId"
            label="关联证照"
            rules={[{ required: true, message: '请选择关联证照' }]}
          >
            <Select placeholder="请选择关联证照">
              {certificates.map((cert) => (
                <Select.Option key={cert.id} value={cert.id}>
                  {cert.code} - {cert.holder}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="processType"
            label="办理类型"
            rules={[{ required: true, message: '请选择办理类型' }]}
          >
            <Select placeholder="请选择办理类型">
              {Object.entries(PROCESS_TYPE_LABELS).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {String(label)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="materials" label="提交材料">
            <Select mode="tags" placeholder="请输入提交材料，按回车确认">
              <Select.Option value="身份证">身份证</Select.Option>
              <Select.Option value="营业执照副本">营业执照副本</Select.Option>
              <Select.Option value="原证书">原证书</Select.Option>
              <Select.Option value="申请表">申请表</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="acceptTime" label="受理时间">
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="选择受理时间" />
          </Form.Item>
          <Form.Item name="estimatedFee" label="预计费用" initialValue={0}>
            <Input type="number" min={0} style={{ width: '100%' }} placeholder="请输入预计费用" />
          </Form.Item>
          <Form.Item name="actualFee" label="实际费用">
            <Input type="number" min={0} style={{ width: '100%' }} placeholder="请输入实际费用（选填）" />
          </Form.Item>
          <Form.Item name="result" label="办理结果" initialValue="processing">
            <Select placeholder="请选择办理结果">
              {Object.entries(PROCESS_RESULT_LABELS).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {String(label)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="completeTime" label="完成时间">
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="选择完成时间" />
          </Form.Item>
          <Form.Item name="attachment" label="附件">
            <Upload
              listType="picture-card"
              beforeUpload={() => false}
              onChange={handleAttachmentChange}
              maxCount={1}
            >
              <div>
                <Paperclip className="w-6 h-6" />
                <div className="mt-2">上传附件</div>
              </div>
            </Upload>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="办理记录详情"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            关闭
          </Button>,
          <Button key="edit" type="primary" icon={<Edit2 className="w-4 h-4" />} onClick={() => {
            if (viewRecord) {
              setIsViewModalOpen(false);
              handleEdit(viewRecord);
            }
          }}>
            编辑记录
          </Button>,
        ]}
        width={700}
      >
        {viewRecord && (
          <div className="py-4">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="关联证照">
                {(() => {
                  const cert = getCertificateInfo(viewRecord.certificateId);
                  return cert ? (
                    <div>
                      <span>{cert.code} - {cert.holder}</span>
                      <Button 
                        type="link" 
                        size="small" 
                        icon={<History className="w-3 h-3" />}
                        onClick={() => {
                          setHistoryCertificateId(viewRecord.certificateId);
                          setIsHistoryModalOpen(true);
                          setIsViewModalOpen(false);
                        }}
                        className="ml-2"
                      >
                        查看历史
                      </Button>
                    </div>
                  ) : '已删除';
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="办理类型">
                {PROCESS_TYPE_LABELS[viewRecord.processType]}
              </Descriptions.Item>
              <Descriptions.Item label="提交材料">
                {viewRecord.materials && viewRecord.materials.length > 0
                  ? viewRecord.materials.join(', ')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="受理时间">
                {viewRecord.acceptTime || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="预计费用">
                ¥{viewRecord.estimatedFee.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="实际费用">
                {viewRecord.actualFee !== undefined && viewRecord.actualFee > 0
                  ? `¥${viewRecord.actualFee.toFixed(2)}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="办理结果">
                <Tag color={getResultColor(viewRecord.result)}>
                  {PROCESS_RESULT_LABELS[viewRecord.result]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {viewRecord.completeTime || '-'}
              </Descriptions.Item>
              {viewRecord.attachment && (
                <Descriptions.Item label="附件">
                  <Button 
                    type="link" 
                    icon={<Eye className="w-4 h-4" />}
                    onClick={() => {
                      if (viewRecord.attachment) {
                        Modal.info({
                          title: '附件预览',
                          content: (
                            <div className="py-4">
                              {viewRecord.attachment?.startsWith('data:') ? (
                                <img src={viewRecord.attachment} alt="附件" className="max-w-full" />
                              ) : (
                                <div className="text-gray-500">{viewRecord.attachment}</div>
                              )}
                            </div>
                          ),
                          width: 800,
                        });
                      }
                    }}
                  >
                    查看附件
                  </Button>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="备注">
                {viewRecord.remark || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDateTime(viewRecord.createdAt)}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      <Modal
        title="证照办理历史"
        open={isHistoryModalOpen}
        onCancel={() => {
          setIsHistoryModalOpen(false);
          setHistoryCertificateId(null);
        }}
        footer={null}
        width={900}
      >
        {historyCertificateId && (
          <div className="py-4">
            {(() => {
              const cert = getCertificateInfo(historyCertificateId);
              return cert ? (
                <Card size="small" className="mb-4 bg-blue-50">
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="证照编号">{cert.code}</Descriptions.Item>
                    <Descriptions.Item label="持有人">{cert.holder}</Descriptions.Item>
                    <Descriptions.Item label="证照类型">{cert.type === 'business_license' ? '营业执照' : cert.type === 'qualification' ? '人员资格证' : '设备检验证'}</Descriptions.Item>
                    <Descriptions.Item label="当前到期日">{cert.endDate}</Descriptions.Item>
                    <Descriptions.Item label="当前状态">
                      <Tag color={cert.status === 'normal' ? 'green' : cert.status === 'expiring' ? 'orange' : 'red'}>
                        {cert.status === 'normal' ? '正常' : cert.status === 'expiring' ? '即将到期' : '已过期'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="最近办理结果">
                      {cert.lastRecordResult ? (
                        <Tag color={getResultColor(cert.lastRecordResult)}>
                          {PROCESS_RESULT_LABELS[cert.lastRecordResult]}
                        </Tag>
                      ) : '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              ) : null;
            })()}
            
            <Divider orientation="left">办理时间线</Divider>
            
            {certificateHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                暂无办理记录
              </div>
            ) : (
              <Timeline
                items={certificateHistory.map((rec) => ({
                  color: rec.result === 'approved' ? 'green' : rec.result === 'rejected' ? 'red' : 'blue',
                  children: (
                    <Card size="small" className="mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Tag color={rec.result === 'approved' ? 'green' : rec.result === 'rejected' ? 'red' : 'blue'}>
                            {PROCESS_TYPE_LABELS[rec.processType]}
                          </Tag>
                          <Tag>{PROCESS_RESULT_LABELS[rec.result]}</Tag>
                          <div className="mt-2 text-sm text-gray-600">
                            受理时间: {rec.acceptTime || '-'}
                          </div>
                          <div className="text-sm text-gray-600">
                            预计费用: ¥{rec.estimatedFee.toFixed(2)}
                            {rec.actualFee !== undefined && rec.actualFee > 0 && (
                              <span className="ml-2">| 实际费用: ¥{rec.actualFee.toFixed(2)}</span>
                            )}
                          </div>
                          {rec.materials && rec.materials.length > 0 && (
                            <div className="text-sm text-gray-600 mt-1">
                              材料: {rec.materials.join(', ')}
                            </div>
                          )}
                          {rec.attachment && (
                            <div className="text-sm text-gray-600 mt-1">
                              附件: <Button type="link" size="small" onClick={() => {
                                Modal.info({
                                  title: '附件预览',
                                  content: (
                                    <div className="py-4">
                                      {rec.attachment?.startsWith('data:') ? (
                                        <img src={rec.attachment} alt="附件" className="max-w-full" />
                                      ) : (
                                        <div className="text-gray-500">{rec.attachment}</div>
                                      )}
                                    </div>
                                  ),
                                  width: 800,
                                });
                              }}>查看附件</Button>
                            </div>
                          )}
                          {rec.remark && (
                            <div className="text-sm text-gray-500 mt-1">
                              备注: {rec.remark}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">
                            {formatDateTime(rec.createdAt)}
                          </div>
                          <Button 
                            type="link" 
                            size="small"
                            icon={<Edit2 className="w-3 h-3" />}
                            onClick={() => handleEdit(rec)}
                          >
                            编辑
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ),
                }))}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Records;
