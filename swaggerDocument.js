const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'telinoo',
    version: '1.0.0',
    description: 'API documentation for telinoo platform',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      noauthAuth: {
        type: 'http',
        scheme: 'noauth',
        description: 'No authentication required for these endpoints'
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Standard JWT token authentication'
      },
    },
    schemas: {
      TalentRegistration: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'john_talent' },
          email: { type: 'string', example: 'talent@example.com' },
          phone_number: { type: 'string', example: '1234567890' },
          password: { type: 'string', example: '123456' },
          role: { type: 'string', example: 'talent' },
          full_name: { type: 'string', example: 'John Doe' },
          country: { type: 'string', example: 'Pakistan' },
          city: { type: 'string', example: 'Lahore' },
          gender: { type: 'string', example: 'Male' },
          age: { type: 'string', example: '25' },
          main_talent: { type: 'string', example: 'actor' },
          languages: { 
            type: 'array',
            items: { type: 'string' },
            example: ['1', '2']
          },
          skills: { 
            type: 'array',
            items: { type: 'string' },
            example: ['1', '2']
          },
          category_id: { type: 'string', example: '1' },
          hourly_rate: { type: 'number', example: 100 }
        }
      },
      AdminRegistration: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'admin123' },
          email: { type: 'string', example: 'admin@example.com' },
          phone_number: { type: 'string', example: '123456789' },
          password: { type: 'string', example: '123456' }
        }
      },
      Skill: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'dancing' }
        }
      },
      MediaUpload: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Media file to upload'
          },
          title: { type: 'string', example: 'My media title' },
          description: { type: 'string', example: 'Description of the media' }
        }
      }
    }
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register talent',
        description: 'Endpoint for talent registration',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/TalentRegistration'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Successful registration',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Registration successful' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/loginWithPhone': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with phone number',
        description: 'Initiate login process by providing phone number',
        security: [{ noauthAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  phone_number: { type: 'string', example: '1234567890' }
                },
                required: ['phone_number']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OTP sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'OTP sent to your phone' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/admin/register': {
      post: {
        tags: ['Admin'],
        summary: 'Register admin',
        description: 'Endpoint for admin registration',
        security: [{ noauthAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AdminRegistration'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Admin registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Admin registration successful' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/admin/login': {
      post: {
        tags: ['Admin'],
        summary: 'Admin login',
        description: 'Endpoint for admin authentication',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'admin123' },
                  password: { type: 'string', example: '123456' }
                },
                required: ['username', 'password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/skill': {
      get: {
        tags: ['Skills'],
        summary: 'Get all skills',
        description: 'Retrieve list of all available skills',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of skills',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '1' },
                      name: { type: 'string', example: 'dancing' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Skills'],
        summary: 'Create new skill',
        description: 'Add a new skill to the system',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Skill'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Skill created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '1' },
                    name: { type: 'string', example: 'dancing' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/skill/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the skill',
          schema: {
            type: 'string'
          }
        }
      ],
      put: {
        tags: ['Skills'],
        summary: 'Update skill',
        description: 'Update an existing skill',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Skill'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Skill updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Skill updated' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Skills'],
        summary: 'Delete skill',
        description: 'Remove a skill from the system',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Skill deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Skill deleted' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/language': {
      get: {
        tags: ['Languages'],
        summary: 'Get all languages',
        description: 'Retrieve list of all available languages',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of languages',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '1' },
                      name: { type: 'string', example: 'English' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Languages'],
        summary: 'Create new language',
        description: 'Add a new language to the system',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Skill' // Reusing Skill schema as it has same structure
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Language created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '1' },
                    name: { type: 'string', example: 'English' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/language/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the language',
          schema: {
            type: 'string'
          }
        }
      ],
      put: {
        tags: ['Languages'],
        summary: 'Update language',
        description: 'Update an existing language',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Skill' // Reusing Skill schema as it has same structure
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Language updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Language updated' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Languages'],
        summary: 'Delete language',
        description: 'Remove a language from the system',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Language deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Language deleted' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/verifyOTP': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify OTP',
        description: 'Verify the OTP sent to user\'s phone',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  phone_number: { type: 'string', example: '1234567890' },
                  code: { type: 'string', example: '229792' }
                },
                required: ['phone_number', 'code']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OTP verified successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/updateProfile': {
      post: {
        tags: ['Authentication'],
        summary: 'Update user profile',
        description: 'Update profile information for authenticated user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/TalentRegistration'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Profile updated' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/country': {
      post: {
        tags: ['Location'],
        summary: 'Create country',
        description: 'Add a new country to the system',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Saudi Arabia' },
                  code: { type: 'string', example: 'SA' }
                },
                required: ['name', 'code']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Country created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '1' },
                    name: { type: 'string', example: 'Saudi Arabia' },
                    code: { type: 'string', example: 'SA' }
                  }
                }
              }
            }
          }
        }
      },
      get: {
        tags: ['Location'],
        summary: 'Get all countries',
        description: 'Retrieve list of all available countries',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of countries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '1' },
                      name: { type: 'string', example: 'Saudi Arabia' },
                      code: { type: 'string', example: 'SA' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/city': {
      get: {
        tags: ['Location'],
        summary: 'Get all cities',
        description: 'Retrieve list of all available cities',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of cities',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '1' },
                      name: { type: 'string', example: 'Riyadh' },
                      country_id: { type: 'string', example: '1' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/contact': {
      post: {
        tags: ['Contact'],
        summary: 'Submit contact form',
        description: 'Submit a contact message to the system',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'sheraz' },
                  email: { type: 'string', example: 'usertest@gmail.com' },
                  subject: { type: 'string', example: 'test' },
                  message: { type: 'string', example: 'test message' }
                },
                required: ['name', 'email', 'subject', 'message']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Contact form submitted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Contact form submitted' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/media/upload': {
      post: {
        tags: ['Media'],
        summary: 'Upload media',
        description: 'Upload media content to the system',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                $ref: '#/components/schemas/MediaUpload'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Media uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '1' },
                    title: { type: 'string', example: 'My media title' },
                    url: { type: 'string', example: 'https://example.com/media/1' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/media': {
      get: {
        tags: ['Media'],
        summary: 'Get all media',
        description: 'Retrieve list of all media content',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of media content',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '1' },
                      title: { type: 'string', example: 'My media title' },
                      url: { type: 'string', example: 'https://example.com/media/1' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/media/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the media',
          schema: {
            type: 'string'
          }
        }
      ],
      put: {
        tags: ['Media'],
        summary: 'Update media',
        description: 'Update media content information',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                $ref: '#/components/schemas/MediaUpload'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Media updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Media updated' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Media'],
        summary: 'Delete media',
        description: 'Remove media content from the system',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Media deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Media deleted' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/media/{id}/share': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the media to share',
          schema: {
            type: 'string'
          }
        }
      ],
      post: {
        tags: ['Media'],
        summary: 'Share media',
        description: 'Share media content with others',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Media shared successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Media shared' },
                    share_url: { type: 'string', example: 'https://example.com/share/abc123' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/media/{id}/like': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the media to like',
          schema: {
            type: 'string'
          }
        }
      ],
      post: {
        tags: ['Media'],
        summary: 'Like media',
        description: 'Like media content',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Media liked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Media liked' },
                    like_count: { type: 'number', example: 42 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/follow/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the user to follow/unfollow',
          schema: {
            type: 'string'
          }
        }
      ],
      post: {
        tags: ['Social'],
        summary: 'Follow user',
        description: 'Follow another user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User followed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'User followed' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Social'],
        summary: 'Unfollow user',
        description: 'Unfollow a user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User unfollowed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'User unfollowed' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/follow': {
      get: {
        tags: ['Social'],
        summary: 'Get followed users',
        description: 'Retrieve list of users the current user is following',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of followed users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '1' },
                      username: { type: 'string', example: 'john_talent' },
                      full_name: { type: 'string', example: 'John Doe' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/talent-categories': {
      get: {
        tags: ['Talent'],
        summary: 'Get talent categories',
        description: 'Retrieve list of all talent categories',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of talent categories',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '1' },
                      name: { type: 'string', example: 'Actor' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Talent'],
        summary: 'Create talent category',
        description: 'Add a new talent category to the system',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Actor' }
                },
                required: ['name']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Talent category created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '1' },
                    name: { type: 'string', example: 'Actor' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/talent-categories/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the talent category',
          schema: {
            type: 'string'
          }
        }
      ],
      put: {
        tags: ['Talent'],
        summary: 'Update talent category',
        description: 'Update an existing talent category',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Updated Category Name' }
                },
                required: ['name']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Talent category updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Category updated' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Talent'],
        summary: 'Delete talent category',
        description: 'Remove a talent category from the system',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Talent category deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Category deleted' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

module.exports = { swaggerUi, swaggerDocument };