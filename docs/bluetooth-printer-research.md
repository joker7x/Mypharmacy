# تحقق تكامل طابعة Bluetooth

تتطلب طابعة **Xprinter XP-233B** اتصال Bluetooth Classic ومكوّنًا أصليًا داخل التطبيق؛ لذلك لن يعمل هذا المسار عبر Expo Go. يُستخدم **Expo Development Build** مع `expo-dev-client` لتضمين أي مكتبة تحتوي على شيفرة أصلية.[1]

تمت مراجعة مكتبة `@brooons/react-native-bluetooth-escpos-printer` (الاسم المعروض في المستودع المتشعب). توثق المكتبة إدارة Bluetooth والاتصال، وطباعة إيصالات ESC/POS مثل النص والأعمدة والباركود، إضافةً إلى طابعة TSC للملصقات. يجب التحقق على جهاز Android فعلي لأن آخر نشاط ظاهر في المستودع قديم نسبيًا؛ لذلك سيُعزل الربط الأصلي خلف واجهة خدمة قابلة للاستبدال، بينما تبقى إعدادات الطابعة وقوالب أوامر ESC/POS وTSPL مستقلة وقابلة للاختبار.[2]

## مراجع

[1]: https://docs.expo.dev/develop/development-builds/introduction/ "Expo: Introduction to development builds"
[2]: https://github.com/letstri/react-native-bluetooth-escpos-printer "letstri/react-native-bluetooth-escpos-printer"
