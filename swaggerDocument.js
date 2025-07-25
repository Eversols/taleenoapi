const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'telinoo',
    version: '1.0.0',
    description: 'Centralized Swagger documentation',
  },
  servers: [
    {
      url: 'http://localhost:5000',
    },
  ],
  components: {
    securitySchemes: {
      noauthAuth: {
        type: 'http',
        scheme: 'noauth',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
//   paths: {
//     '/api/auth/register': {
//       post: {
//         tags: ['default'],
//         summary: 'register',
//         requestBody: {
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 example: {
//                   username: 'john_talen2t',
//                   email: 'talent2@example.com',
//                   phone_number: '1234567890',
//                   password: '123456',
//                   role: 'talent',
//                   full_name: 'John Doe',
//                   country: 'Pakistan',
//                   city: 'Lahore',
//                   main_talent: 'actor',
//                   languages: ['1', '2'],
//                   skills: ['1', '2'],
//                   hourly_rate: 100,
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           '200': {
//             description: 'Successful response',
//             content: {
//               'application/json': {},
//             },
//           },
//         },
//       },
//     },
//     '/api/auth/loginWithPhone': {
//       post: {
//         tags: ['default'],
//         summary: 'loginWithPhone',
//         security: [{ noauthAuth: [] }],
//         requestBody: {
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 example: {
//                   phone_number: '1234567890',
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           '200': {
//             description: 'Successful response',
//             content: {
//               'application/json': {},
//             },
//           },
//         },
//       },
//     },
//     '/api/admin/register': {
//       post: {
//         tags: ['default'],
//         summary: 'Admin Register',
//         security: [{ noauthAuth: [] }],
//         requestBody: {
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 example: {
//                   username: 'admin123',
//                   email: 'admin@example.com',
//                   phone_number: '123456789',
//                   password: '123456',
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           '200': {
//             description: 'Successful response',
//             content: {
//               'application/json': {},
//             },
//           },
//         },
//       },
//     },
//     '/api/admin/login': {
//       post: {
//         tags: ['default'],
//         summary: 'Admin login',
//         requestBody: {
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 example: {
//                   username: 'admin123',
//                   password: '123456',
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           '200': {
//             description: 'Successful response',
//             content: {
//               'application/json': {},
//             },
//           },
//         },
//       },
//     },
//     '/api/skill': {
//       get: {
//         tags: ['default'],
//         summary: 'get skills',
//         security: [{ bearerAuth: [] }],
//         responses: {
//           '200': {
//             description: 'Successful response',
//             content: {
//               'application/json': {},
//             },
//           },
//         },
//       },
//       post: {
//         tags: ['default'],
//         summary: 'Create Skill',
//         security: [{ bearerAuth: [] }],
//         requestBody: {
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 example: {
//                   name: 'dancing',
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           '200': {
//             description: 'Successful response',
//             content: {
//               'application/json': {},
//             },
//           },
//         },
//       },
//     },
//     '/api/skill/1': {
//       put: {
//         tags: ['default'],
//         summary: 'Update Skill',
//         security: [{ bearerAuth: [] }],
//         requestBody: {
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 example: {
//                   name: 'acting',
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           '200': {
//             description: 'Successful response',
//             content: {
//               'application/json': {},
//             },
//           },
//         },
//       },
//     },
//     '/api/skill/3': {
//       delete: {
//         tags: ['default'],
//         summary: 'Deleted Skill',
//         security: [{ bearerAuth: [] }],
//         responses: {
//           '200': {
//             description: 'Successful response',
//             content: {
//               'application/json': {},
//             },
//           },
//         },
//       },
//     },
//   },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['default'],
        summary: 'register',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  username: 'john_talen2t',
                  email: 'talent2@example.com',
                  phone_number: '1234567890',
                  password: '123456',
                  role: 'talent',
                  full_name: 'John Doe',
                  country: 'Pakistan',
                  city: 'Lahore',
                  main_talent: 'actor',
                  languages: ['1', '2'],
                  skills: ['1', '2'],
                  hourly_rate: 100,
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/auth/loginWithPhone': {
      post: {
        tags: ['default'],
        summary: 'loginWithPhone',
        security: [{ noauthAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  phone_number: '1234567890',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/admin/register': {
      post: {
        tags: ['default'],
        summary: 'Admin Register',
        security: [{ noauthAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  username: 'admin123',
                  email: 'admin@example.com',
                  phone_number: '123456789',
                  password: '123456',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/admin/login': {
      post: {
        tags: ['default'],
        summary: 'Admin login',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  username: 'admin123',
                  password: '123456',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/skill': {
      get: {
        tags: ['default'],
        summary: 'get skills',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
      post: {
        tags: ['default'],
        summary: 'Create Skill',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  name: 'dancing',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/skill/1': {
      put: {
        tags: ['default'],
        summary: 'Update Skill',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  name: 'acting',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/skill/3': {
      delete: {
        tags: ['default'],
        summary: 'Deleted Skill',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/language': {
      get: {
        tags: ['default'],
        summary: 'get language',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
      post: {
        tags: ['default'],
        summary: 'Create language',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  name: 'dancing',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/language/1': {
      put: {
        tags: ['default'],
        summary: 'Update language',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  name: 'acting',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/language/3': {
      delete: {
        tags: ['default'],
        summary: 'Deleted language',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/auth/verifyOTP': {
      post: {
        tags: ['default'],
        summary: 'verifyOTP',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  phone_number: '1234567890',
                  code: '229792',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/auth/updateProfile': {
      post: {
        tags: ['default'],
        summary: 'Update Profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  username: 'john_talen2t',
                  email: 'talent@example.com',
                  phone_number: '1234567890',
                  password: '123456',
                  role: 'talent',
                  full_name: 'John Doe',
                  country: 'Pakistan',
                  city: 'Lahore',
                  main_talent: 'actor',
                  languages: ['1', '2'],
                  skills: ['1', '2'],
                  hourly_rate: 100,
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/country': {
      post: {
        tags: ['default'],
        summary: 'Create country',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  name: 'Saudi Arabia',
                  code: 'SA',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
      get: {
        tags: ['default'],
        summary: 'get country',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/city': {
      get: {
        tags: ['default'],
        summary: 'get city',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/contact': {
      post: {
        tags: ['default'],
        summary: 'contact submitted',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  name: 'sheraz',
                  email: 'usertest@gmail.com',
                  subject: 'test',
                  message: 'test',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/media/upload': {
      post: {
        tags: ['default'],
        summary: 'Media Content upload',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                  },
                  title: {
                    type: 'string',
                    example: 'dsss',
                  },
                  description: {
                    type: 'string',
                    example: 'sasas',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/media': {
      get: {
        tags: ['default'],
        summary: 'Media Content Get',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/media/1': {
      put: {
        tags: ['default'],
        summary: 'Media Content Update',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                  },
                  title: {
                    type: 'string',
                    example: 'sss',
                  },
                  description: {
                    type: 'string',
                    example: 'sasas',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
      delete: {
        tags: ['default'],
        summary: 'Media Content Delete',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/media/2/share': {
      post: {
        tags: ['default'],
        summary: 'Media Content Share',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                  },
                  title: {
                    type: 'string',
                    example: 'dsss',
                  },
                  description: {
                    type: 'string',
                    example: 'sasas',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/media/2/like': {
      post: {
        tags: ['default'],
        summary: 'Media Content Like',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                  },
                  title: {
                    type: 'string',
                    example: 'dsss',
                  },
                  description: {
                    type: 'string',
                    example: 'sasas',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/follow/4': {
      post: {
        tags: ['default'],
        summary: 'Follow User',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                  },
                  title: {
                    type: 'string',
                    example: 'dsss',
                  },
                  description: {
                    type: 'string',
                    example: 'sasas',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
      delete: {
        tags: ['default'],
        summary: 'Unfollow User',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
    '/api/follow': {
      get: {
        tags: ['default'],
        summary: 'All Following User',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {},
            },
          },
        },
      },
    },
  },
};

module.exports = { swaggerUi, swaggerDocument };
