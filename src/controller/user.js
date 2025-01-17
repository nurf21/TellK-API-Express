const bcrypt = require('bcrypt')
const helper = require('../helper')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const nodemailer = require('nodemailer')
const {
  getUserByEmail,
  postUser,
  getUserById,
  patchUser,
  getUserByKey
} = require('../model/user')

module.exports = {
  regUser: async (req, res) => {
    const salt = bcrypt.genSaltSync(8)
    const encryptPassword = bcrypt.hashSync(req.body.user_password, salt)
    const checkEmail = await getUserByEmail(req.body.user_email)
    const setData = {
      user_name: req.body.user_name,
      user_email: req.body.user_email,
      user_password: encryptPassword,
      user_image: 'blank-profile.jpg',
      user_phone: req.body.user_phone,
      user_lat: '',
      user_lng: '',
      user_activity: 0,
      user_key: 0,
      user_status: 1,
      user_created_at: new Date()
    }
    try {
      if (checkEmail.length > 0) {
        return helper.response(res, 400, 'Email is already registered')
      } else if (
        req.body.user_password.length < 8 ||
        req.body.user_password.length > 16
      ) {
        return helper.response(res, 400, 'Password must be 8-16 characters')
      } else if (
        setData.user_phone.length < 10 ||
        setData.user_phone.length > 13
      ) {
        return helper.response(res, 400, 'Invalid phone number')
      } else {
        const result = await postUser(setData)
        return helper.response(res, 200, 'Register Success', result)
      }
    } catch (err) {
      return helper.response(res, 400, 'Bad Request')
    }
  },
  loginUser: async (req, res) => {
    try {
      const checkEmail = await getUserByEmail(req.body.user_email)
      if (checkEmail.length < 1) {
        return helper.response(res, 400, 'Email is not registered')
      } else {
        const checkPassword = bcrypt.compareSync(
          req.body.user_password,
          checkEmail[0].user_password
        )
        if (!checkPassword) {
          return helper.response(res, 400, 'Wrong password')
        } else {
          let payload = {
            user_id: checkEmail[0].user_id,
            user_name: checkEmail[0].user_name,
            user_email: checkEmail[0].user_email,
            user_image: checkEmail[0].user_image,
            user_phone: checkEmail[0].user_phone,
            user_lat: checkEmail[0].user_lat,
            user_lng: checkEmail[0].user_lng
          }
          if (checkEmail[0].user_status === 0) {
            return helper.response(
              res,
              400,
              'Your account is not activaed, please check your Email'
            )
          } else {
            const token = jwt.sign(payload, process.env.KEY, {
              expiresIn: '6h'
            })
            payload = { ...payload, token }
            return helper.response(res, 200, 'Login Success', payload)
          }
        }
      }
    } catch (err) {
      return helper.response(res, 400, 'Bad Request')
    }
  },
  getUserById: async (req, res) => {
    const { id } = req.params
    try {
      const result = await getUserById(id)
      return helper.response(res, 200, 'Get User by Id Success', result)
    } catch (err) {
      return helper.response(res, 400, 'Bad Request')
    }
  },
  patchImageUser: async (req, res) => {
    const { id } = req.params
    try {
      const setData = {
        user_image: req.file.filename,
        user_updated_at: new Date()
      }
      const checkId = await getUserById(id)
      if (checkId.length > 0) {
        if (
          checkId[0].user_image === 'blank-profile.jpg' ||
          req.file == undefined
        ) {
          const result = await patchUser(setData, id)
          return helper.response(res, 201, 'Profile Photo Updated', result)
        } else {
          fs.unlink(`./uploads/${checkId[0].user_image}`, async (error) => {
            if (error) {
              throw error
            } else {
              const result = await patchUser(setData, id)
              return helper.response(res, 201, 'Profile Photo Updated', result)
            }
          })
        }
      } else {
        return helper.response(res, 404, 'User not found')
      }
    } catch (err) {
      return helper.response(res, 400, 'Bad Request', err)
    }
  },
  patchUserProfile: async (req, res) => {
    const { id } = req.params
    try {
      const setData = {
        user_name: req.body.user_name,
        user_phone: req.body.user_phone,
        user_updated_at: new Date()
      }
      if (setData.user_phone.length < 10 || setData.user_phone.length > 13) {
        return helper.response(res, 400, 'Invalid phone number')
      } else {
        const checkId = await getUserById(id)
        if (checkId.length > 0) {
          const result = await await patchUser(setData, id)
          return helper.response(res, 201, 'Profile Updated', result)
        } else {
          return helper.response(res, 404, 'User not found')
        }
      }
    } catch (err) {
      return helper.response(res, 400, 'Bad Request', err)
    }
  },
  patchLocation: async (req, res) => {
    const { id } = req.params
    try {
      const setData = {
        user_activity: 1,
        user_lat: req.body.lat,
        user_lng: req.body.lng,
        user_updated_at: new Date()
      }
      const result = await patchUser(setData, id)
      return helper.response(res, 201, 'Location Updated', result)
    } catch (err) {
      return helper.response(res, 400, 'Bad Request', err)
    }
  },
  getUserByEmail: async (req, res) => {
    const { email } = req.params
    try {
      const result = await getUserByEmail(email)
      if (result.length > 0) {
        delete result[0].user_password
        delete result[0].user_key
        delete result[0].user_status
        delete result[0].user_created_at
        delete result[0].user_updated_at
      }
      return helper.response(res, 200, 'Get User by Email Success', result)
    } catch (err) {
      return helper.response(res, 400, 'Bad Request')
    }
  },
  forgotPassword: async (request, response) => {
    const { email } = request.body
    const key = Math.round(Math.random() * 100000)
    try {
    const checkUser = await getUserByEmail(email)
    if (checkUser.length < 1) {
      return helper.response(response, 400, 'Email is not registered')
    } else {
      const setData = {
        user_key: key,
        user_updated_at: new Date()
      }
      await patchUser(setData, checkUser[0].user_id)
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.USER,
          pass: process.env.PASS
        }
      })
      const newLocal = (await transporter.sendMail({
        from: '"TellK"',
        to: email,
        subject: 'TellK - Forgot Password',
        html: `Click <a href="${process.env.URL}/reset?key=${key}">here</a> to reset your password.`
      }),
      function (error) {
        if (error) {
          return helper.response(response, 400, 'Failed to send email')
        }
      })
      return helper.response(response, 200, 'Email sent. Please check your inbox', newLocal)
    }
    } catch (error) {
      return helper.response(response, 400, 'Bad Request', error)
    }
  },
  resetPassword: async (request, response) => {
    const { key, newPassword, confirmPassword } = request.body
    try {
      if (newPassword.length < 8 || newPassword.length > 16) {
        return helper.response(response, 400, 'Password must be 8-16 characters long')
      } else if (newPassword !== confirmPassword) {
        return helper.response(response, 400, "Password didn't match")
      } else {
        const checkKey = await getUserByKey(key)
        if (checkKey.length < 1) {
          return helper.response(response, 400, 'Invalid key')
        } else {
          const userId = checkKey[0].user_id
          const span = new Date() - checkKey[0].user_updated_at
          const minuteSpan = Math.floor(span / 1000 / 60)
          if (minuteSpan >= 5) {
            const setData = {
              user_key: 0,
              user_updated_at: new Date()
            }
            await patchUser(setData, userId)
            return helper.response(response, 400, 'Key has expired. Please enter your email again')
          } else {
            const salt = bcrypt.genSaltSync(7)
            const encryptPassword = bcrypt.hashSync(newPassword, salt)
            const setData = {
              user_password: encryptPassword,
              user_key: 0,
              user_updated_at: new Date()
            }
            await patchUser(setData, userId)
            return helper.response(response, 200, 'Password reset successfully')
          }
        }
      }
    } catch (error) {
      return helper.response(response, 400, 'Bad Request', error)
    }
  },
  logout: async (req, res) => {
    const { id } = req.params
    try {
      const setData = {
        user_activity: 0,
        user_updated_at: new Date()
      }
      const result = await patchUser(setData, id)
      return helper.response(res, 201, 'Status Updated', result)
    } catch (err) {
      return helper.response(res, 400, 'Bad Request', err)
    }
  }
}
