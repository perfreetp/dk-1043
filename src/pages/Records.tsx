import React, { useState } from 'react';
import { Table, Button, Input, Select, Modal, Form, DatePicker, InputNumber, message, Tag, Card, Row, Col, Descriptions } from 'antd';
import { Plus, Search, Eye, Edit2, FileText } from 'lucide-react';
import { useStore } from '../stores';
import { PROCESS_TYPE_LABELS, PROCESS_RESULT_LABELS, type Record as RecordType, type ProcessType, type ProcessResult } from '../types';
import { formatDateTime } from '../utils';

const Records: React.FC = () => {
  const { records, certificates, addRecord, updateRecord } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordType | null>(null);
  const [searchText, setSearchText] = useState('');
  const [processTypeFilter, setProcessTypeFilter] = useState<ProcessType | ''>('');
  const [resultFilter, setResultFilter] = useState<ProcessResult | ''>('');
  const [form] = Form.useForm();

  const filteredRecords = records.filter((rec) => {
    const certificate = certificates.find((c) => c.id === rec.certificateId);
    const matchesSearch =
      !searchText ||
      (certificate?.code.toLowerCase().includes(searchText.toLowerCase()) ?? false) ||
      (certificate?.holder.toLowerCase().includes(searchText.toLowerCase()) ?? false);
    const matchesType = !processTypeFilter || rec.processType === processTypeFilter;
    const matchesResult = !resultFilter || rec.result === resultFilter;
    return matchesSearch && matchesType && matchesResult;
  });

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: RecordType) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      acceptTime: record.acceptTime ? new Date(record.acceptTime) : null,
      completeTime: record.completeTime ? new Date(record.completeTime) : null,
    });
    setIsModalOpen(true);
  };

  const handleView = (record: RecordType) => {
    setEditingRecord(record);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const recordData = {
        ...values,
        acceptTime: values.acceptTime?.format('YYYY-MM-DD HH:mm') || '',
        completeTime: values.completeTime?.format('YYYY-MM-DD HH:mm') || '',
        materials: values.materials || [],
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

  const columns = [
    {
      title: '关联证照',
      key: 'certificate',
      width: 180,
      render: (_: unknown, record: RecordType) => {
        const cert = getCertificateInfo(record.certificateId);
        return cert ? (
          <span className="text-blue-600">{cert.code}</span>
        ) : (
          <span className="text-gray-400">已删除</span>
        );
      },
    },
    {
      title: '持有人',
      key: 'holder',
      width: 150,
      render: (_: unknown, record: RecordType) => {
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
      width: 180,
    },
    {
      title: '办理费用',
      dataIndex: 'fee',
      key: 'fee',
      width: 100,
      render: (fee: number) => fee > 0 ? `¥${fee}` : '-',
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
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: RecordType) => (
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
        </div>
      ),
    },
  ];

  const statistics = {
    total: records.length,
    approved: records.filter((r) => r.result === 'approved').length,
    rejected: records.filter((r) => r.result === 'rejected').length,
    processing: records.filter((r) => r.result === 'processing').length,
    totalFee: records.reduce((sum, r) => sum + r.fee, 0),
  };

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
            placeholder="办理类型"
            value={processTypeFilter || undefined}
            onChange={(value) => setProcessTypeFilter(value)}
            allowClear
            style={{ width: 120 }}
          >
            {Object.entries(PROCESS_TYPE_LABELS).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {label}
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
                {label}
              </Select.Option>
            ))}
          </Select>
          <div className="ml-auto text-gray-600">
            总费用: <span className="font-bold text-lg">¥{statistics.totalFee}</span>
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
                  {label}
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
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="fee" label="办理费用">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入办理费用" />
          </Form.Item>
          <Form.Item name="result" label="办理结果" initialValue="processing">
            <Select placeholder="请选择办理结果">
              {Object.entries(PROCESS_RESULT_LABELS).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="completeTime" label="完成时间">
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
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
        ]}
        width={600}
      >
        {editingRecord && (
          <div className="py-4">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="关联证照">
                {(() => {
                  const cert = getCertificateInfo(editingRecord.certificateId);
                  return cert ? `${cert.code} - ${cert.holder}` : '已删除';
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="办理类型">
                {PROCESS_TYPE_LABELS[editingRecord.processType]}
              </Descriptions.Item>
              <Descriptions.Item label="提交材料">
                {editingRecord.materials.length > 0
                  ? editingRecord.materials.join(', ')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="受理时间">
                {editingRecord.acceptTime || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="办理费用">
                {editingRecord.fee > 0 ? `¥${editingRecord.fee}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="办理结果">
                <Tag color={getResultColor(editingRecord.result)}>
                  {PROCESS_RESULT_LABELS[editingRecord.result]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {editingRecord.completeTime || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注">
                {editingRecord.remark || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDateTime(editingRecord.createdAt)}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Records;
