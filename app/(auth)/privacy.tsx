import LegalDocumentScreen from '../../src/components/legal/LegalDocumentScreen';

export default function PrivacyScreen() {
  return (
    <LegalDocumentScreen
      title="Privacy Policy"
      subtitle="This policy describes how Wasla handles personal information you provide through the app. Replace this draft with counsel-approved text before public release."
      sections={[
        {
          heading: 'Who we are',
          body: [
            'Wasla operates this mobile application to help you discover stations, book seats, and store tickets issued after successful payment.',
          ],
        },
        {
          heading: 'Information we collect',
          body: [
            'Account data such as name, email, phone number, and authentication identifiers.',
            'Booking-related data such as station, route, seat count, and ticket identifiers necessary to complete trips.',
            'Technical data such as device type and diagnostics where enabled for reliability (see your observability configuration).',
          ],
        },
        {
          heading: 'How we use information',
          body: [
            'To create and secure your account, process bookings and payments with central servers and stations, issue tickets, and communicate transactional notices.',
            'To improve stability and detect abuse when diagnostic tooling is enabled.',
          ],
        },
        {
          heading: 'Sharing',
          body: [
            'We share data with service providers needed to run Wasla (e.g. hosting, authentication, payment) and with station systems required to hold seats and confirm trips.',
            'We do not sell your personal information.',
          ],
        },
        {
          heading: 'Retention and security',
          body: [
            'We retain data only as long as needed for the purposes above and as required by law. We apply reasonable safeguards appropriate to the nature of the data.',
          ],
        },
        {
          heading: 'Your choices',
          body: [
            'You may request access, correction, or deletion where applicable law provides these rights. Add a clear contact channel (email or in-app support) before production launch.',
          ],
        },
      ]}
    />
  );
}
