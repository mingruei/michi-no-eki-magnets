export type Locale = 'zh-Hant';

export type TranslationDictionary = {
  app: {
    title: string;
    subtitle: string;
  };
  common: {
    all: string;
    close: string;
    number: string;
    back: string;
    location: string;
  };
  screen: {
    map: string;
    list: string;
    settings: string;
  };
  globalUpload: {
    fabLabel: string;
    chooseSource: string;
    confirmTitle: string;
    typeLabel: string;
    typeHintCastleCard: string;
    typeHintGoshuin: string;
    castleLabel: string;
    castleSearchPlaceholder: string;
    castleSearchHint: string;
    suggested: string;
    confirmSave: string;
    pdfNotSupported: string;
    failed: string;
  };
  settings: {
    title: string;
    cloudSync: string;
    cloudSyncHint: string;
    cloudAccount: string;
    backendLabel: string;
    cloudNotConfigured: string;
    signedIn: string;
    signInGoogle: string;
    signOut: string;
    syncing: string;
    signInFailed: string;
    providerGoogle: string;
    chooseSignIn: string;
    chooseSignInHint: string;
    openSignIn: string;
    noSignInProviders: string;
    devBuildRequired: string;
    oauthSecretMissing: string;
    oauthRedirectMismatch: string;
    oauthSetupHint: string;
    nativeSignInFallback: string;
    mapProvider: string;
    mapProviderHint: string;
    mapProviderApple: string;
    mapProviderGoogle: string;
  };
  filter: {
    region: string;
    prefecture: string;
    series: string;
    name: string;
    namePlaceholder: string;
    selectRegion: string;
    selectPrefecture: string;
    selectSeries: string;
    resultHint: string;
  };
  stats: {
    visited: string;
    meijoStamp: string;
    goshuin: string;
    castleCard: string;
    rowOriginal: string;
    rowContinued: string;
    rowTotal: string;
  };
  castle: {
    seriesOriginal: string;
    seriesContinued: string;
    seriesOriginalFull: string;
    seriesContinuedFull: string;
    history: string;
    access: string;
    website: string;
    emptyTitle: string;
    emptyBody: string;
    description: string;
    stampLocation: string;
    traffic: string;
    drivingLabel: string;
    drivingNavigation: string;
    parkingNavigation: string;
    massTransportLabel: string;
    openStampMap: string;
    openTransitMap: string;
    stampLocationValueOriginal: string;
    stampLocationValueContinued: string;
    continuedDescription: string;
    noDescription: string;
    noStampLocation: string;
    noMassTransport: string;
    progress: string;
    visited: string;
    meijoStamp: string;
    goshuin: string;
    castleCard: string;
    goshuinUploadTitle: string;
    castleCardUploadTitle: string;
    collectibleUpload: string;
    collectibleChooseSource: string;
    collectibleScan: string;
    collectibleUploadFile: string;
    collectiblePhotoLibrary: string;
    collectibleEmpty: string;
    collectibleStorageHint: string;
    collectibleDeleteHint: string;
    collectibleCameraPermissionDenied: string;
    collectibleMediaPermissionDenied: string;
    collectibleLoadFailed: string;
    collectibleUploadFailed: string;
    collectibleViewerCounter: string;
    collectibleViewerSwipeHint: string;
    collectibleViewerDismissHint: string;
    collectibleOpenPdf: string;
  };
  regions: Record<
    | 'hokkaido'
    | 'tohoku'
    | 'kanto'
    | 'chubu'
    | 'kinki'
    | 'chugoku'
    | 'shikoku'
    | 'kyushu',
    string
  >;
  prefectures: Record<string, string>;
};

export type TranslationParams = Record<string, string | number>;
