<template>
  <div id="app">
    <c-dialog ref="loginDialog" title='请输入你的昵称' confirmBtn="开始聊天" @confirm="login">
      <input class="nickname" v-model="nickname" type="text" placeholder="请输入你的昵称">
    </c-dialog>

    <c-dialog ref="createGroupDialog" title='请输入房间名称' confirmBtn="确认" @confirm="createGroup">
      <input class="nickname" v-model="groupName" type="text" placeholder="请输入房间名称">
    </c-dialog>

    <div class="web-im dis-flex">
      <div class="left">
        <div class="aside content">
          <div class="header">
            <div class="tabbar dis-flex">
              <label :class="{active:switchType==1, unread: usersUnRead}" for="" @click="switchType=1">在线人员</label>
              <label :class="{active:switchType==2, unread: groupsUnRead}" for="" @click="switchType=2">房间</label>
            </div>
          </div>
          <div class="body user-list">
              <div v-if="switchType==2" class="user" @click="triggerGroup(item)" v-for="(item,index) in currentGroups" :key="index">
              {{item.name}}
              <span class="tips-num" v-if="item.unread">{{item.unread}}</span>
              <span v-if="!checkUserIsGroup(item)" @click.stop="addGroup(item)" class="add-group">+</span>
            </div>
              <div v-if="switchType==1 && item.uid!=uid" class="user" @click="triggerPersonal(item)" :class="{offline: !item.status}" v-for="(item,index) in currentUserList" :key="index">
              {{item.nickname}}
              <span class="tips-num" v-if="item.unread">{{item.unread}}</span>
            </div>
          </div>
          <div class="footer">
            <div class="func dis-flex">
              <label @click="$refs.createGroupDialog.show()">创建房间</label>
            </div>
          </div>
        </div>
      </div>
      <div class="right content">
        <div class="header im-title">{{title}}</div>
        <div class="body im-record" id="im-record">
          <div class="ul">
            <div class="li" :class="{user: item.uid == uid}" v-for="(item,index) in currentMessage" :key="index">
              <template v-if="item.type===1">
                <p class="join-tips">{{item.msg}}</p>
              </template>
              <template v-else>
                <p class="message-date">
                  <span class="m-nickname">{{item.nickname}}</span> {{item.date}}</p>
                <p class="message-box" >{{item.msg}}</p>
              </template>
            </div>
          </div>
        </div>
        <div class="footer im-input dis-flex">
          <input type="text" v-model="msg" placeholder="请输入内容">
          <button @click="send">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import moment from 'moment'

import Cdialog from './components/dialog/dialog'


export default {
  name: 'App',
  components: {
    'c-dialog': Vue.extend(require('@/components/dialog/dialog.vue').default)
  },
  data(){
    return {
      title: '请选择房间或者人员进行聊天',
      switchType: 1,
      uid: '',
      nickname: '',
      socket: '',
      msg: '',
      messageList: [],//消息
      users: [],//用户
      groups: [],//房间数组
      groupId: '',//房间id
      bridge: [],
      groupName: ''
    }
  },
  mounted() {
    let vm = this;
    let user = localStorage.getItem('WEB_IM_USER');//获取本地存储用户信息
    user = user && JSON.parse(user) || {};
    vm.uid = user.uid;
    vm.nickname = user.nickname;

    if(!vm.uid){//是否第一次登陆
      vm.$refs.loginDialog.show()
    } else {
      vm.conWebSocket();
    }

    document.onkeydown = function (event) {
        var e = event || window.event;
        if (e && e.keyCode == 13) { //回车键的键值为13
            vm.send()
        }
    }
    window.onbeforeunload = function (e) {
      vm.socket.send(JSON.stringify({
        uid: vm.uid,
        type: 2,
        nickname: vm.nickname,
        bridge: []
      }));
    }
  },
  computed: {
    currentMessage() {//当前对话渲染的msg列表 
      let vm = this;
      let data = vm.messageList.filter(item=>{//数组排序，转换成字符串后进行对比
        if(item.type === 1) {
          return item;
        } else if(this.groupId) {
          return item.groupId === this.groupId
        } else if(item.bridge.length){
          return item.bridge.sort().join(',') == vm.bridge.sort().join(',')
        }
      })
      data.map(item=>{
        item.status = 0
        return item;
      })
      return data;
    },
    currentGroups() {
      let vm = this;
      vm.groups.map(group=>{
        group.unread = this.messageList.filter(item=>{
          return item.groupId === group.id && item.status === 1
        }).length
        return group;
      })
      return vm.groups;
    },
    //房间未读消息
    groupsUnRead(){
      return this.messageList.some(item=>{
        return item.groupId && item.status === 1
      })
    },
    //私聊未读消息
    usersUnRead(){
      return this.messageList.some(item=>{
        return item.bridge.length && item.status === 1
      })
    },
    currentUserList() {
      let vm = this;
      vm.users.map(user=>{
        user.unread = this.messageList.filter(item=>{
          return item.bridge.length && item.uid === user.uid && item.status === 1
        }).length
        return user;
      })
      return vm.users;
    },
  },
  methods: {
    //加入房间
    addGroup(item){
      this.socket.send(JSON.stringify({
        uid: this.uid,
        type: 20,
        nickname: this.nickname,
        groupId: item.id,
        groupName: item.name,
        bridge: []
      }));
      this.$message({type: 'success', message: `成功加入${item.name}房间`})
    },
    //判断用户是否是房间成员
    checkUserIsGroup (item) {
      return item.users.some(item=>{
        return item.uid === this.uid
      })
    },
    //创建房间
    createGroup(){
      this.groupName = this.groupName.trim();
      if(!this.groupName){
        this.$message({type: 'error', message: '请输入房间名称'})
        return;
      }
      this.socket.send(JSON.stringify({
        uid: this.uid,
        type: 10,
        nickname: this.nickname,
        groupName: this.groupName,
        bridge: []
      }));
    },
    // 切换到群聊
    triggerGroup(item) {
      let issome = item.users.some(item=>{
        return item.uid === this.uid
      })
      if(!issome){
        this.$message({type: 'error', message: `您还不是${item.name}房间成员`})
        return
      }
      this.bridge = [];
      this.groupId = item.id;
      this.title = `当前房间：${item.name}`;
    },
    // 切换到某个用户
    triggerPersonal(item) {
      if(this.uid === item.uid){
        return;
      }
      this.groupId = '';
      this.bridge = [this.uid, item.uid];// 将当前用户uid，和需要对话的uid放入bridge
      this.title = `${item.nickname}`;
    },
    send(){
      this.msg = this.msg.trim();
      if(!this.msg){
        return
      }
      if(!this.bridge.length && !this.groupId){
        this.$message({type: 'error', message: '请选择发送人或者房间'})
        return;
      }
      this.sendMessage(100, this.msg)
    },
    sendMessage(type, msg){
      this.socket.send(JSON.stringify({
        uid: this.uid,
        type: type,
        nickname: this.nickname,
        msg: msg,
        bridge: this.bridge,
        groupId: this.groupId
      }));
      this.msg = '';
    },
    conWebSocket(){
      let vm = this;
      if(window.WebSocket){
        vm.socket = new WebSocket('ws://localhost:8001');
        let socket = vm.socket;

        socket.onopen = function(e){
          console.log("连接服务器成功");
          vm.$message({type: 'success', message: '连接服务器成功'})
          if(!vm.uid){// 生成新的用户id,并存入localStorage
            vm.uid = 'web_im_' + moment().valueOf();
            localStorage.setItem('WEB_IM_USER', JSON.stringify({
              uid: vm.uid,
              nickname: vm.nickname
            }))
          }
          vm.sendMessage(1)
        }
        socket.onclose = function(e){
          console.log("服务器关闭");
        }
        socket.onerror = function(){
          console.log("连接出错");
        }
        // 接收服务器的消息
        socket.onmessage = function(e){
          let message = JSON.parse(e.data);
          vm.messageList.push(message);
          if(message.users) {//有users就赋值给users
            vm.users = message.users;
          }
          if (message.groups){//有groups群组就赋值给groups
            vm.groups = message.groups;
          }
          
          vm.$nextTick(function(){
            var div = document.getElementById('im-record');
            div.scrollTop = div.scrollHeight;
          })
        }
      }
    },

    login(){
      this.nickname = this.nickname.trim();
      if(!this.nickname){
        this.$message({type: 'error', message: '请输入您的昵称'})
        return;
      }
      this.$refs.loginDialog.hide()
      this.conWebSocket();
    }
  }
}
</script>

<style lang='stylus'>
  @import './assets/css/app.styl';
</style>
