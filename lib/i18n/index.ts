import en from './en.json'
import hi from './hi.json'

export type Language = 'en' | 'hi'
export type Messages = typeof en

const hindiPortalCopy: Record<string, string> = {
  Borrower: 'उधारकर्ता',
  Issuer: 'जारीकर्ता',
  Lender: 'ऋणदाता',
  'Trust Admin': 'विश्वास व्यवस्थापक',
  'Design system': 'डिज़ाइन प्रणाली',
  'Issuer portal': 'जारीकर्ता पोर्टल',
  'Lender workspace': 'ऋणदाता कार्यक्षेत्र',
  'Trust administration': 'विश्वास प्रशासन',
  'Public trust explorer': 'सार्वजनिक विश्वास एक्सप्लोरर',
  'Safety test lab': 'सुरक्षा परीक्षण प्रयोगशाला',
  'Borrower passport': 'उधारकर्ता पासपोर्ट',
  Overview: 'अवलोकन',
  Subjects: 'लाभार्थी',
  'Issue credential': 'प्रमाणपत्र जारी करें',
  'Issue a credential': 'प्रमाणपत्र जारी करें',
  Credentials: 'प्रमाणपत्र',
  'Status lists': 'स्थिति सूचियाँ',
  'Status list': 'स्थिति सूची',
  'Signing keys': 'हस्ताक्षर कुंजियाँ',
  'Keys and DID': 'कुंजियाँ और DID',
  Activity: 'गतिविधि',
  Requests: 'अनुरोध',
  'Request detail': 'अनुरोध विवरण',
  'Borrower requests': 'उधारकर्ता अनुरोध',
  'Request review': 'अनुरोध समीक्षा',
  Policy: 'नीति',
  'Underwriting policy': 'ऋण मूल्यांकन नीति',
  'Trusted issuers': 'विश्वसनीय जारीकर्ता',
  Offers: 'प्रस्ताव',
  'Loan offers': 'ऋण प्रस्ताव',
  Compliance: 'अनुपालन',
  'Compliance controls': 'अनुपालन नियंत्रण',
  Settings: 'सेटिंग्स',
  'Workspace settings': 'कार्यक्षेत्र सेटिंग्स',
  Registry: 'रजिस्ट्री',
  'Trusted registry': 'विश्वसनीय रजिस्ट्री',
  'Review queue': 'समीक्षा कतार',
  'Audit log': 'ऑडिट लॉग',
  'Audit trail': 'ऑडिट रिकॉर्ड',
  Explorer: 'एक्सप्लोरर',
  'Public explorer': 'सार्वजनिक एक्सप्लोरर',
  'Attack Lab': 'अटैक लैब',
  'Component gallery': 'कंपोनेंट गैलरी',
  'Issuer overview': 'जारीकर्ता अवलोकन',
  'Credential subjects': 'प्रमाणपत्र लाभार्थी',
  'Issued credentials': 'जारी प्रमाणपत्र',
  'Lending overview': 'ऋण अवलोकन',
  'Trust network overview': 'विश्वास नेटवर्क अवलोकन',
  'SanadTrustRegistry Explorer': 'SanadTrustRegistry एक्सप्लोरर',
  'Attack Lab: watch Sanad say no': 'अटैक लैब: Sanad को अस्वीकार करते देखें',
  'Unable to load this workspace': 'यह कार्यक्षेत्र लोड नहीं हो सका',
  'The mock API did not return the portal data. Your shared records have not been changed.': 'मॉक API से पोर्टल डेटा नहीं मिला। आपके साझा रिकॉर्ड नहीं बदले गए हैं।',
  'Try again': 'फिर प्रयास करें',
  'A borrower-first trust layer for verifiable income, responsible lending and consent that travels with you.': 'सत्यापित आय, जिम्मेदार ऋण और आपके साथ रहने वाली सहमति के लिए उधारकर्ता-केंद्रित विश्वास परत।',
  'Selective disclosure by default': 'डिफ़ॉल्ट रूप से चुनिंदा जानकारी साझा करें',
  'Synthetic demo data · no real lending': 'कृत्रिम डेमो डेटा · वास्तविक ऋण नहीं',
  'Prototype. Synthetic data. Testnet only.': 'प्रोटोटाइप। कृत्रिम डेटा। केवल टेस्टनेट।',
}

export function getMessages(language: Language): Messages {
  return language === 'hi' ? hi : en
}

export function translatePortalPhrase(language: Language, phrase: string) {
  return language === 'hi' ? hindiPortalCopy[phrase] ?? phrase : phrase
}
