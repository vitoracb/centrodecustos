export default {
  expo: {
    name: 'Now Tranding',
    slug: 'nowtrading-centrodecustos',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './icons/nowtranding_icon_1024.png',
    userInterfaceStyle: 'light',

    splash: {
      image: './icons/nowtranding_icon_1024.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },

    assetBundlePatterns: ['**/*'],

    ios: {
      bundleIdentifier: 'com.nowtranding.centrodecustos',
      supportsTablet: true,
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription:
          'Este app precisa acessar a câmera para capturar fotos de documentos e comprovantes.',
        NSPhotoLibraryUsageDescription:
          'Este app precisa acessar suas fotos para anexar documentos.',
        NSPhotoLibraryAddUsageDescription:
          'Este app precisa salvar fotos na galeria.',
        NSDocumentsFolderUsageDescription:
          'Este app precisa acessar documentos para anexar comprovantes.',
      },
    },

    android: {
      package: 'com.nowtranding.centrodecustos',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './icons/nowtranding_icon_1024.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'READ_MEDIA_VIDEO',
      ],
    },

    web: {
      favicon: './icons/nowtranding_icon_1024.png',
    },

    plugins: [
      'expo-router',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Este app precisa acessar suas fotos para anexar documentos.',
          cameraPermission:
            'Este app precisa acessar a câmera para capturar fotos de documentos.',
        },
      ],
      [
        'expo-document-picker',
        {
          iCloudContainerEnvironment: 'Production',
        },
      ],
    ],

    extra: {
      eas: {
        projectId: '612e9bb2-32a9-47b9-b56f-062c769ca5c2',
      },
    },
  },
};

