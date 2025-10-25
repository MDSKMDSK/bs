// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Button, Card, CardContent, Avatar, AvatarFallback, AvatarImage, useToast } from '@/components/ui';
// @ts-ignore;
import { Loader2, User, Store } from 'lucide-react';

export default function LoginPage(props) {
  const {
    $w,
    style
  } = props;
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    checkLoginStatus();
  }, []);
  const checkLoginStatus = async () => {
    try {
      // 获取微信登录状态
      const tcb = await $w.cloud.getCloudInstance();
      const auth = tcb.auth({
        persistence: 'local'
      });
      const loginState = await auth.getLoginState();
      if (loginState && loginState.isLogin) {
        // 获取微信用户信息
        const wxUserResult = await $w.cloud.callFunction({
          name: 'getWxUserInfo',
          data: {}
        });
        if (wxUserResult.code === 0 && wxUserResult.data) {
          const openid = wxUserResult.data.openid;
          const user = await getUserInfoFromDB(openid);
          if (user) {
            setUserInfo(user);
            setShowRoleSelect(true);
          }
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      toast({
        title: "检查失败",
        description: "无法获取登录状态，请重试",
        variant: "destructive"
      });
    }
  };
  const getUserInfoFromDB = async openid => {
    try {
      const result = await $w.cloud.callDataSource({
        dataSourceName: 'users',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              openid: {
                $eq: openid
              }
            }
          },
          select: {
            $master: true
          }
        }
      });
      if (result.records && result.records.length > 0) {
        return result.records[0];
      }
      return null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 如果是权限错误，给出友好提示
      if (error.code === 'PERMISSION_DENIED') {
        toast({
          title: "权限错误",
          description: "请检查数据库权限设置",
          variant: "destructive"
        });
      }
      return null;
    }
  };
  const handleWechatLogin = async () => {
    setLoading(true);
    try {
      // 获取微信用户信息
      const userProfile = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: reject
        });
      });
      if (userProfile.userInfo) {
        const wxUserInfo = userProfile.userInfo;

        // 获取openid
        const openidResult = await $w.cloud.callFunction({
          name: 'getWxOpenid',
          data: {}
        });
        const openid = openidResult.data.openid;

        // 检查用户是否已存在
        const existingUser = await getUserInfoFromDB(openid);
        let user;
        if (existingUser) {
          // 更新用户信息（仅更新头像和昵称）
          await $w.cloud.callDataSource({
            dataSourceName: 'users',
            methodName: 'wedaUpdateV2',
            params: {
              data: {
                avatar: wxUserInfo.avatarUrl,
                nickName: wxUserInfo.nickName,
                updateTime: new Date()
              },
              filter: {
                where: {
                  openid: {
                    $eq: openid
                  }
                }
              }
            }
          });
          user = {
            ...existingUser,
            avatar: wxUserInfo.avatarUrl,
            nickName: wxUserInfo.nickName
          };
          toast({
            title: "登录成功",
            description: "欢迎回来！"
          });
        } else {
          // 创建新用户
          const createResult = await $w.cloud.callDataSource({
            dataSourceName: 'users',
            methodName: 'wedaCreateV2',
            params: {
              data: {
                openid: openid,
                avatar: wxUserInfo.avatarUrl,
                nickName: wxUserInfo.nickName,
                username: `wx_${openid.substring(0, 8)}`,
                role: null,
                createTime: new Date(),
                updateTime: new Date()
              }
            }
          });
          user = {
            _id: createResult.id,
            openid: openid,
            avatar: wxUserInfo.avatarUrl,
            nickName: wxUserInfo.nickName,
            username: `wx_${openid.substring(0, 8)}`,
            role: null
          };
          toast({
            title: "注册成功",
            description: "欢迎新用户！"
          });
        }
        setUserInfo(user);
        setShowRoleSelect(true);
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      toast({
        title: "登录失败",
        description: error.message || "请重试",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleRoleSelect = async role => {
    try {
      await $w.cloud.callDataSource({
        dataSourceName: 'users',
        methodName: 'wedaUpdateV2',
        params: {
          data: {
            role: role,
            updateTime: new Date()
          },
          filter: {
            where: {
              openid: {
                $eq: userInfo.openid
              }
            }
          }
        }
      });

      // 更新本地用户信息
      const updatedUser = {
        ...userInfo,
        role
      };
      setUserInfo(updatedUser);

      // 跳转到对应页面
      const targetPage = role === 'merchant' ? 'merchant-home' : 'user-home';
      $w.utils.navigateTo({
        pageId: targetPage,
        params: {
          userId: userInfo._id
        }
      });
      toast({
        title: "身份选择成功",
        description: `已选择${role === 'merchant' ? '商家' : '用户'}身份`
      });
    } catch (error) {
      console.error('选择身份失败:', error);
      toast({
        title: "选择失败",
        description: "请重试",
        variant: "destructive"
      });
    }
  };
  if (showRoleSelect && userInfo) {
    return <div style={style} className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">选择您的身份</h1>
            <p className="text-gray-600">请选择您要使用的身份类型</p>
          </div>

          <div className="space-y-4">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => handleRoleSelect('user')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">普通用户</h3>
                    <p className="text-sm text-gray-600">浏览商品、下单购物</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => handleRoleSelect('merchant')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Store className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">商家</h3>
                    <p className="text-sm text-gray-600">管理商品、处理订单</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={userInfo.avatar} alt={userInfo.nickName} />
                <AvatarFallback>{userInfo.nickName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-medium text-gray-900">{userInfo.nickName}</p>
                <p className="text-sm text-gray-600">已登录</p>
              </div>
            </div>
          </div>
        </div>
      </div>;
  }
  return <div style={style} className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-12">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎使用</h1>
          <p className="text-gray-600">请使用微信账号登录</p>
        </div>

        <div className="space-y-4">
          <Button onClick={handleWechatLogin} disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-white h-12 text-lg font-medium">
            {loading ? <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                登录中...
              </> : <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
                </svg>
                微信一键登录
              </>}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            登录即表示您同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>
    </div>;
}