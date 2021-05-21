import React, { PureComponent as Component } from 'react';
import { formatTime } from '../../common.js';
import { Link } from 'react-router-dom';
import { addUserActions, setBreadcrumb } from '../../reducer/modules/user';
import PropTypes from 'prop-types'
import { connect } from 'react-redux';
import { Form, Table, Popconfirm, message, Input, Button, Modal} from 'antd';
import axios from 'axios';

const Search = Input.Search;
const limit = 20;

const FormItem = Form.Item;

@connect(
  state => {
    return {
      curUserRole: state.user.role
    };
  },
  {
    setBreadcrumb,
    addUserActions
  }
)
class List extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      total: null,
      current: 1,
      backups: [],
      isSearch: false,
      addUserVisible:false
    };
  }
  static propTypes = {
    form: PropTypes.object,
    setBreadcrumb: PropTypes.func,
    curUserRole: PropTypes.string,
	addUserActions:PropTypes.func
  };
  changePage = current => {
    this.setState(
      {
        current: current
      },
      this.getUserList
    );
  };

  getUserList() {
    axios.get('/api/user/list?page=' + this.state.current + '&limit=' + limit).then(res => {
      let result = res.data;

      if (result.errcode === 0) {
        let list = result.data.list;
        let total = result.data.count;
        list.map((item, index) => {
          item.key = index;
          item.up_time = formatTime(item.up_time);
        });
        this.setState({
          data: list,
          total: total,
          backups: list
        });
      }
    });
  }

  componentDidMount() {
    this.getUserList();
  }

  confirm = uid => {
    axios
      .post('/api/user/del', {
        id: uid
      })
      .then(
        res => {
          if (res.data.errcode === 0) {
            message.success('已删除此用户');
            let userlist = this.state.data;
            userlist = userlist.filter(item => {
              return item._id != uid;
            });
            this.setState({
              data: userlist
            });
          } else {
            message.error(res.data.errmsg);
          }
        },
        err => {
          message.error(err.message);
        }
      );
  };

  async componentWillMount() {
    this.props.setBreadcrumb([{ name: '用户管理' }]);
  }

  handleSearch = value => {
    let params = { q: value };
    if (params.q !== '') {
      axios.get('/api/user/search', { params }).then(data => {
        let userList = [];

        data = data.data.data;
        if (data) {
          data.forEach(v =>
            userList.push({
              ...v,
              _id: v.uid
            })
          );
        }

        this.setState({
          data: userList,
          isSearch: true
        });
      });
    } else {
      this.setState({
        data: this.state.backups,
        isSearch: false
      });
    }
  };
  //新增用户
  handleSubmit = e => {
    e.preventDefault();
    const form = this.props.form;
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.props.addUserActions({...values}).then(res => {
          if (res.payload.data.errcode == 0) {
            this.setState({
              addUserVisible:false
            },()=>{
              this.getUserList()
              message.success('新增成功! ');
            })
          }
        });
      }
    });
  };
  render() {
    const {getFieldDecorator} = this.props.form;
    const role = this.props.curUserRole;
    let data = [];
    if (role === 'admin') {
      data = this.state.data;
    }else{
      this.setState({total:0});
	}
    let columns = [
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        width: 180,
        render: (username, item) => {
          return <Link to={'/user/profile/' + item._id}>{item.username}</Link>;
        }
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email'
      },
      {
        title: '用户角色',
        dataIndex: 'role',
        key: 'role',
        width: 150
      },
      {
        title: '更新日期',
        dataIndex: 'up_time',
        key: 'up_time',
        width: 160
      },
      {
        title: '功能',
        key: 'action',
        width: '90px',
        render: item => {
          return (
            <span>
              {/* <span className="ant-divider" /> */}
              <Popconfirm
                title="确认删除此用户?"
                onConfirm={() => {
                  this.confirm(item._id);
                }}
                okText="确定"
                cancelText="取消"
              >
                <a style={{ display: 'block', textAlign: 'center' }} href="#">
                  删除
                </a>
              </Popconfirm>
            </span>
          );
        }
      }
    ];

    columns = columns.filter(item => {
      if (item.key === 'action' && role !== 'admin') {
        return false;
      }
      return true;
    });

    const pageConfig = {
      total: this.state.total,
      pageSize: limit,
      current: this.state.current,
      onChange: this.changePage
    };

    const defaultPageConfig = {
      total: this.state.data.length,
      pageSize: limit,
      current: 1
    };
    const layout = {
        labelCol: {
            span: 4
        },
        wrapperCol: {
            span: 16
        }
    };

    return (
      <section className="user-table">
        <h3 style={{ marginBottom: '15px' }}>用户总数：{this.state.total}位</h3>
        <div className="user-search-wrapper">
          <Search onChange={e => this.handleSearch(e.target.value)}
              onSearch={this.handleSearch} 
              placeholder="请输入用户名"
          />
          <Button onClick={() => this.setState({ addUserVisible: true })} type={'primary'}>新增用户</Button>
        </div>
        <Table
            bordered={true}
            rowKey={record => record._id}
            columns={columns}
            pagination={this.state.isSearch ? defaultPageConfig : pageConfig}
            dataSource={data}
          />
        {this.state.addUserVisible ? (
          <Modal title="新增用户" visible={this.state.addUserVisible}
              onCancel={() => this.setState({ addUserVisible: false })}
              onOk={this.handleSubmit}
              // footer={null}
              className="addusermodal"
          >
            <Form  onSubmit={this.handleSubmit}>
              {/* 用户名 */}
              <FormItem {...layout} label={'用户名'}>
                {getFieldDecorator('userName', {
                        rules: [{ required: true, message: '请输入用户名' }]
                      })(
                        <Input/>
                      )}
              </FormItem>
              {/* Emaiil */}
              <FormItem {...layout} label={'Email'}>
                {getFieldDecorator('email', {
                  rules: [
                    {
                      required: true,
                      message: '请输入email',
                      pattern: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{1,})+$/
                    }
                  ]
                })(
                  <Input/>
                )}
              </FormItem>
              {/* password */}
              <FormItem {...layout} label={'密码'}>
                {getFieldDecorator('password', {
                  rules: [
                    {
                      required: true,
                      message: '请输入密码!'
                    }
                  ],
                  initlValue: '123456'
                  })(
                    <Input/>
                  )}
              </FormItem>
            </Form>
          </Modal>
        ): (
          ''
        )}
      </section>
    );
  }
}

const ListForm = Form.create()(List);
export default ListForm;
