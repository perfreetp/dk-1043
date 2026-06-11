import React, { useState } from 'react';
import { Table, Button, Input, Select, Space, Tag, Modal, Form, DatePicker, Upload, Popconfirm, message } from 'antd';
import { Plus, Search, Upload as UploadIcon, Eye, Delete, Edit2 } from 'lucide-react';
import { useStore } from '../stores';
import { CERTIFICATE_TYPE_LABELS, CERTIFICATE_STATUS_LABELS, type Certificate, type CertificateType } from '../types';
import { formatDate, getDaysUntilExpiry } from '../utils';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const CertificateLibrary: React.FC = () => {
  const { certificates, stores, addCertificate, updateCertificate, deleteCertificate } = useStore();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<CertificateType | ''>('');
  const [statusFilter, setStatusFilter] = useState<Certificate['status'] | ''>('');
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [form] = Form.useForm();

  const filteredCertificates = certificates.filter((cert) => {
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

  const handleAdd = () => {
    setEditingCertificate(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: Certificate) => {
    setEditingCertificate(record);
    form.setFieldsValue({
      ...record,
      stores: record.stores,
      dateRange: [dayjs(record.startDate), dayjs(record.endDate)],
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteCertificate(id);
    message.success('删除成功');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [startDate, endDate] = values.dateRange;

      const certificateData = {
        code: values.code,
        type: values.type,
        holder: values.holder,
        issuer: values.issuer,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        stores: values.stores || [],
        attachment: values.attachment?.file?.name || '',
        remark: values.remark || '',
      };

      if (editingCertificate) {
        updateCertificate(editingCertificate.id, certificateData);
        message.success('更新成功');
      } else {
        addCertificate(certificateData);
        message.success('添加成功');
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const columns = [
    {
      title: '证照编号',
      dataIndex: 'code',
      key: 'code',
      fixed: 'left' as const,
      width: 120,
    },
    {
      title: '证照类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: CertificateType) => CERTIFICATE_TYPE_LABELS[type],
    },
    {
      title: '持有人',
      dataIndex: 'holder',
      key: 'holder',
      width: 180,
    },
    {
      title: '发证单位',
      dataIndex: 'issuer',
      key: 'issuer',
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
      title: '剩余天数',
      key: 'daysLeft',
      width: 100,
      render: (_: unknown, record: Certificate) => {
        const days = getDaysUntilExpiry(record.endDate);
        return (
          <Tag color={days < 0 ? 'red' : days <= 30 ? 'orange' : 'green'}>
            {days < 0 ? `${Math.abs(days)}天` : `${days}天`}
          </Tag>
        );
      },
    },
    {
      title: '适用门店',
      dataIndex: 'stores',
      key: 'stores',
      width: 180,
      render: (storeIds: string[]) => (
        <span>
          {storeIds
            .map((id) => stores.find((s) => s.id === id)?.name)
            .filter(Boolean)
            .join(', ')}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Certificate['status']) => (
        <Tag
          color={
            status === 'normal' ? 'green' : status === 'expiring' ? 'orange' : 'red'
          }
        >
          {CERTIFICATE_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 180,
      render: (_: unknown, record: Certificate) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => handleEdit(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<Edit2 className="w-4 h-4" />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否确认删除？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<Delete className="w-4 h-4" />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">证照库</h1>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          新增证照
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <Space wrap size="middle" className="w-full">
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
                {label}
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
                {label}
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
          <Button onClick={() => {
            setSearchText('');
            setTypeFilter('');
            setStatusFilter('');
            setStoreFilter('');
          }}>
            重置筛选
          </Button>
        </Space>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <Table
          columns={columns}
          dataSource={filteredCertificates}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1200 }}
        />
      </div>

      <Modal
        title={editingCertificate ? '编辑证照' : '新增证照'}
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
            name="code"
            label="证照编号"
            rules={[{ required: true, message: '请输入证照编号' }]}
          >
            <Input placeholder="请输入证照编号" />
          </Form.Item>
          <Form.Item
            name="type"
            label="证照类型"
            rules={[{ required: true, message: '请选择证照类型' }]}
          >
            <Select placeholder="请选择证照类型">
              {Object.entries(CERTIFICATE_TYPE_LABELS).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="holder"
            label="持有人"
            rules={[{ required: true, message: '请输入持有人' }]}
          >
            <Input placeholder="请输入持有人" />
          </Form.Item>
          <Form.Item
            name="issuer"
            label="发证单位"
            rules={[{ required: true, message: '请输入发证单位' }]}
          >
            <Input placeholder="请输入发证单位" />
          </Form.Item>
          <Form.Item
            name="dateRange"
            label="有效期"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="stores" label="适用门店">
            <Select mode="multiple" placeholder="请选择适用门店">
              {stores.map((store) => (
                <Select.Option key={store.id} value={store.id}>
                  {store.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="attachment" label="扫描件">
            <Upload beforeUpload={() => false}>
              <Button icon={<UploadIcon className="w-4 h-4" />}>上传扫描件</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CertificateLibrary;
