// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Card, CardContent, Button, useToast } from '@/components/ui';
// @ts-ignore;
import { ShoppingBag, Heart, MapPin, User } from 'lucide-react';

export default function UserHome(props) {
  const {
    $w,
    style
  } = props;
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadUserInfo();
  }, []);
  const loadUserInfo = async () => {
    try {
      // 获取当前用户信息
      const wxUserResult = await $w.cloud.callFunction({
        name: 'getWxUserInfo',
        data: {}
      });
      if (wxUserResult.code === 0 && wxUserResult.data) {
        const openid = wxUserResult.data.openid;
        const userResult = await $w.cloud.callDataSource({
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
        if (userResult.records && userResult.records.length > 0) {
          setUserInfo(userResult.records[0]);
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      toast({
        title: "加载失败",
        description: "无法获取用户信息",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div style={style} className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>;
  }
  return <div style={style} className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            {userInfo?.avatar && <img src={userInfo.avatar} alt={userInfo.nickName} className="w-12 h-12 rounded-full" />}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">用户中心</h1>
              <p className="text-gray-600">欢迎回来，{userInfo?.nickName || '用户'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">收藏夹</p>
                  <p className="text-lg font-semibold">24</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">待收货</p>
                  <p className="text-lg font-semibold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button className="w-full h-12" onClick={() => $w.utils.navigateTo({
          pageId: 'product-list',
          params: {
            userId: userInfo?._id
          }
        })}>
            <ShoppingBag className="mr-2 h-5 w-5" />
            发现好物
          </Button>

          <Button variant="outline" className="w-full h-12" onClick={() => $w.utils.navigateTo({
          pageId: 'my-orders',
          params: {
            userId: userInfo?._id
          }
        })}>
            <MapPin className="mr-2 h-5 w-5" />
            我的订单
          </Button>

          <Button variant="outline" className="w-full h-12" onClick={() => $w.utils.navigateTo({
          pageId: 'user-profile',
          params: {
            userId: userInfo?._id
          }
        })}>
            <User className="mr-2 h-5 w-5" />
            个人设置
          </Button>
        </div>
      </div>
    </div>;
}