import React, { useState } from 'react';
import { Table, Button, Input, Select, Space, Tag, Modal, Form, DatePicker, Upload, Popconfirm, message } from 'antd';
import { Plus, Search, Upload as UploadIcon, Eye, Delete, Edit2, Bell, History } from 'lucide-react';
import type { UploadFile } from 'antd/es/upload/interface';
import { useStore } from '../stores';
import { CERTIFICATE_TYPE_LABELS, CERTIFICATE_STATUS_LABELS, type Certificate, type CertificateType } from '../types';
import { formatDate, getDaysUntilExpiry } from '../utils';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const CertificateLibrary: React.FC = () => {
  const { certificates, stores, records, addCertificate, updateCertificate, deleteCertificate, addRecord } = useStore();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<CertificateType | ''>('');
  const [statusFilter, setStatusFilter] = useState<Certificate['status'] | ''>('');
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [renewingCertificate, setRenewingCertificate] = useState<Certificate | null>(null);
  const [form] = Form.useForm();
  const [renewForm] = Form.useForm();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [existingAttachment, setExistingAttachment] = useState<string>('');

  const getLatestRecord = (certificateId: string) => {
    const certRecords = records
      .filter((r) => r.certificateId === certificateId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return certRecords.length > 0 ? certRecords[0] : null;
  };

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
    setExistingAttachment('');
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: Certificate) => {
    setEditingCertificate(record);
    setExistingAttachment(record.attachment || '');
    form.setFieldsValue({
      ...record,
      stores: record.stores,
      dateRange: [dayjs(record.startDate), dayjs(record.endDate)],
    });
    setIsModalOpen(true);
  };

  const handlePreview = (record: Certificate) => {
    if (record.attachment) {
      setPreviewUrl(record.attachment);
      setIsPreviewOpen(true);
    } else {
      message.info('暂无附件');
    }
  };

  const handleRenew = (record: Certificate) => {
    setRenewingCertificate(record);
    renewForm.setFieldsValue({
      certificateId: record.id,
      processType: 'renewal',
      acceptTime: dayjs(),
      materials: getSuggestedMaterials(record.type),
      remark: `建议续期，提前准备材料。证照到期日：${formatDate(record.endDate)}`,
    });
    setIsRenewModalOpen(true);
  };

  const getSuggestedMaterials = (type: CertificateType): string[] => {
    const baseMaterials = ['身份证', '原证书', '申请表'];
    switch (type) {
      case 'business_license':
        return [...baseMaterials, '营业执照副本', '法人身份证', '公司章程'];
      case 'qualification':
        return [...baseMaterials, '培训证明', '体检报告'];
      case 'inspection':
        return [...baseMaterials, '设备检测报告', '维护记录'];
      default:
        return baseMaterials;
    }
  };

  const handleRenewSubmit = async () => {
    try {
      const values = await renewForm.validateFields();
      const acceptTime = values.acceptTime ? values.acceptTime.format('YYYY-MM-DD HH:mm') : '';
      
      const recordData = {
        certificateId: values.certificateId,
        processType: values.processType,
        materials: values.materials || [],
        acceptTime,
        fee: Number(values.fee) || 0,
        result: 'processing' as const,
        remark: values.remark || '',
      };

      addRecord(recordData);
      message.success('已成功创建续办记录，请到办理记录页面继续编辑');
      setIsRenewModalOpen(false);
      renewForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDelete = (id: string) => {
    deleteCertificate(id);
    message.success('删除成功');
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
      const [startDate, endDate] = values.dateRange;

      const attachment = values.attachment || existingAttachment;

      const certificateData = {
        code: values.code,
        type: values.type,
        holder: values.holder,
        issuer: values.issuer,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        stores: values.stores || [],
        attachment,
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
      setExistingAttachment('');
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setExistingAttachment('');
    form.resetFields();
  };

  const getResultTag = (result?: string) => {
    if (!result) return null;
    const color = result === 'approved' ? 'green' : result === 'rejected' ? 'red' : 'blue';
    const text = result === 'approved' ? '已通过' : result === 'rejected' ? '未通过' : '受理中';
    return <Tag color={color}>{text}</Tag>;
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
      title: '最近办理',
      key: 'lastRecord',
      width: 120,
      render: (_: unknown, record: Certificate) => {
        const latestRecord = getLatestRecord(record.id);
        if (!latestRecord) return <span className="text-gray-400">-</span>;
        return getResultTag(latestRecord.result);
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 320,
      render: (_: unknown, record: Certificate) => (
        <Space size="small">
          {(record.status === 'expiring' || record.status === 'expired') && (
            <Button
              type="primary"
              size="small"
              icon={<Bell className="w-4 h-4" />}
              onClick={() => handleRenew(record)}
            >
              续办
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button>
          <Button
            type="link"
            size="small"
            icon={<History className="w-4 h-4" />}
            onClick={() => {
              message.info('请到办理记录页面查看该证照的完整历史');
            }}
          >
            历史
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

  const uploadButton = (
    <div>
      <UploadIcon className="w-6 h-6" />
      <div className="mt-2">上传扫描件</div>
    </div>
  );

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
          scroll={{ x: 1400 }}
        />
      </div>

      <Modal
        title={editingCertificate ? '编辑证照' : '新增证照'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleModalClose}
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
                  {String(label)}
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
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={true}
              beforeUpload={() => false}
              onChange={handleAttachmentChange}
              maxCount={1}
            >
              {uploadButton}
            </Upload>
            {existingAttachment && !form.getFieldValue('attachment') && (
              <div className="mt-2 text-sm text-gray-500">
                已有附件: <Button type="link" size="small" onClick={() => { setPreviewUrl(existingAttachment); setIsPreviewOpen(true); }}>预览</Button>
              </div>
            )}
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="快速创建续办记录"
        open={isRenewModalOpen}
        onOk={handleRenewSubmit}
        onCancel={() => {
          setIsRenewModalOpen(false);
          renewForm.resetFields();
        }}
        width={600}
        okText="确认创建"
        cancelText="取消"
      >
        {renewingCertificate && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="font-medium text-blue-800">{renewingCertificate.code}</div>
            <div className="text-sm text-blue-600 mt-1">{renewingCertificate.holder}</div>
            <div className="text-sm text-blue-600">当前到期日：{formatDate(renewingCertificate.endDate)}</div>
          </div>
        )}
        <Form form={renewForm} layout="vertical" className="mt-4">
          <Form.Item
            name="certificateId"
            label="关联证照"
            rules={[{ required: true, message: '请选择关联证照' }]}
          >
            <Select placeholder="请选择关联证照" disabled>
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
              <Select.Option value="renewal">续期</Select.Option>
              <Select.Option value="new">新办</Select.Option>
              <Select.Option value="change">变更</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="materials" label="建议材料">
            <Select mode="tags" placeholder="请选择或输入提交材料">
              {getSuggestedMaterials(renewingCertificate?.type || 'business_license').map((m) => (
                <Select.Option key={m} value={m}>{m}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="acceptTime" label="受理时间">
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="fee" label="预计费用">
            <Input type="number" min={0} placeholder="请输入预计费用" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="附件预览"
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        footer={null}
        width={800}
      >
        <div className="py-4 text-center">
          {previewUrl ? (
            previewUrl.startsWith('data:') ? (
              <img src={previewUrl} alt="附件预览" className="max-w-full mx-auto" />
            ) : (
              <div className="text-gray-500">
                <Eye className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p>附件格式不支持预览</p>
                <p className="text-sm mt-2">{previewUrl}</p>
              </div>
            )
          ) : (
            <div className="text-gray-500">
              <Eye className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p>暂无附件</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CertificateLibrary;
