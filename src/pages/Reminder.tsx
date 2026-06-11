import React, { useState } from 'react';
import { Table, Button, Input, Modal, Form, Select, Switch, Popconfirm, message, Tag, Card, Row, Col } from 'antd';
import { Plus, Search, Bell, Trash2, Edit2 } from 'lucide-react';
import { useStore } from '../stores';
import type { ReminderRule } from '../types';
import { formatDateTime } from '../utils';

const Reminder: React.FC = () => {
  const { reminderRules, certificates, addReminderRule, updateReminderRule, deleteReminderRule } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const filteredRules = reminderRules.filter((rule) =>
    !searchText ||
    rule.handler.toLowerCase().includes(searchText.toLowerCase())
  );

  const getStatusColor = (advanceDays: number) => {
    if (advanceDays <= 7) return 'red';
    if (advanceDays <= 15) return 'orange';
    if (advanceDays <= 30) return 'yellow';
    return 'blue';
  };

  const getStatusText = (advanceDays: number) => {
    if (advanceDays <= 7) return '紧急';
    if (advanceDays <= 15) return '重要';
    if (advanceDays <= 30) return '一般';
    return '提前';
  };

  const handleAdd = () => {
    setEditingRule(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: ReminderRule) => {
    setEditingRule(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteReminderRule(id);
    message.success('删除成功');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingRule) {
        updateReminderRule(editingRule.id, values);
        message.success('更新成功');
      } else {
        addReminderRule(values);
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
      title: '提前天数',
      dataIndex: 'advanceDays',
      key: 'advanceDays',
      width: 120,
      render: (days: number) => (
        <Tag color={getStatusColor(days)}>
          {days}天 {getStatusText(days)}
        </Tag>
      ),
    },
    {
      title: '处理人',
      dataIndex: 'handler',
      key: 'handler',
      width: 150,
    },
    {
      title: '弹窗提醒',
      dataIndex: 'popupEnabled',
      key: 'popupEnabled',
      width: 120,
      render: (enabled: boolean) => (
        <Switch checked={enabled} disabled />
      ),
    },
    {
      title: '系统通知',
      dataIndex: 'notificationEnabled',
      key: 'notificationEnabled',
      width: 120,
      render: (enabled: boolean) => (
        <Switch checked={enabled} disabled />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: ReminderRule) => (
        <div className="flex gap-2">
          <Button
            type="link"
            icon={<Edit2 className="w-4 h-4" />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="是否确认删除此提醒规则？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<Trash2 className="w-4 h-4" />}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const expiringCertificates = certificates
    .filter((c) => c.status === 'expiring' || c.status === 'expired')
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">提醒设置</h1>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          添加规则
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="提醒规则">
            <div className="mb-4">
              <Input
                placeholder="搜索处理人"
                prefix={<Search className="w-4 h-4 text-gray-400" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <Table
              columns={columns}
              dataSource={filteredRules}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="即将到期的证照">
            <div className="space-y-3">
              {expiringCertificates.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  暂无即将到期的证照
                </div>
              ) : (
                expiringCertificates.map((cert) => {
                  const days = Math.ceil((new Date(cert.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const applicableRule = reminderRules.find(
                    (r) => r.advanceDays >= days && r.popupEnabled
                  );

                  return (
                    <div
                      key={cert.id}
                      className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-800">{cert.code}</div>
                          <div className="text-sm text-gray-500 mt-1">{cert.holder}</div>
                        </div>
                        <div className="text-right">
                          <Tag color={days < 0 ? 'red' : 'orange'}>
                            {days < 0 ? `已过期${Math.abs(days)}天` : `${days}天后到期`}
                          </Tag>
                          {applicableRule && (
                            <div className="text-xs text-gray-400 mt-1">
                              提醒人: {applicableRule.handler}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="提醒级别说明">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center mb-2">
              <Bell className="w-5 h-5 text-red-600 mr-2" />
              <span className="font-semibold text-red-800">紧急</span>
            </div>
            <div className="text-sm text-red-600">7天内到期</div>
            <div className="text-xs text-red-400 mt-1">需要立即处理</div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center mb-2">
              <Bell className="w-5 h-5 text-orange-600 mr-2" />
              <span className="font-semibold text-orange-800">重要</span>
            </div>
            <div className="text-sm text-orange-600">15天内到期</div>
            <div className="text-xs text-orange-400 mt-1">尽快处理</div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center mb-2">
              <Bell className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-semibold text-yellow-800">一般</span>
            </div>
            <div className="text-sm text-yellow-600">30天内到期</div>
            <div className="text-xs text-yellow-400 mt-1">可以处理</div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-2">
              <Bell className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-semibold text-blue-800">提前</span>
            </div>
            <div className="text-sm text-blue-600">60-90天内到期</div>
            <div className="text-xs text-blue-400 mt-1">提前准备</div>
          </div>
        </div>
      </Card>

      <Modal
        title={editingRule ? '编辑提醒规则' : '添加提醒规则'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        width={500}
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="advanceDays"
            label="提前提醒天数"
            rules={[{ required: true, message: '请输入提前提醒天数' }]}
          >
            <Select placeholder="请选择提前提醒天数">
              <Select.Option value={7}>7天（紧急）</Select.Option>
              <Select.Option value={15}>15天（重要）</Select.Option>
              <Select.Option value={30}>30天（一般）</Select.Option>
              <Select.Option value={60}>60天（提前）</Select.Option>
              <Select.Option value={90}>90天（提前）</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="handler"
            label="处理人"
            rules={[{ required: true, message: '请输入处理人' }]}
          >
            <Input placeholder="请输入处理人姓名" />
          </Form.Item>
          <Form.Item
            name="popupEnabled"
            label="弹窗提醒"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="notificationEnabled"
            label="系统通知"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Reminder;
