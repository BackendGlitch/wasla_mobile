import LegalDocumentScreen from '../../src/components/legal/LegalDocumentScreen';

export default function TermsScreen() {
  return (
    <LegalDocumentScreen
      title="Terms of Service"
      subtitle="These Terms explain how you may use Wasla when booking rides with partnered stations. Replace this draft with counsel-approved text before public release."
      sections={[
        {
          heading: 'Acceptance',
          body: [
            'By creating an account or booking a trip through Wasla, you agree to these Terms and to our Privacy Policy.',
            'If you do not agree, do not use the app.',
          ],
        },
        {
          heading: 'Service overview',
          body: [
            'Wasla connects you to stations for seat availability, booking, and ticketing. Travel is performed by operators at each station. Wasla does not itself operate vehicles.',
          ],
        },
        {
          heading: 'Accounts and security',
          body: [
            'You are responsible for activity on your account. Keep your credentials and device secure. Notify us if you suspect unauthorised access (add your support contact when finalising this page).',
          ],
        },
        {
          heading: 'Bookings, payment, and cancellations',
          body: [
            'Offers, prices, holds, and cancellations follow the rules shown in the app and those applied by the station / payment provider. Fees and refund policies may vary by route or operator.',
          ],
        },
        {
          heading: 'Limitation of liability',
          body: [
            'Wasla is provided “as available”. To the fullest extent permitted by law, Wasla is not liable for indirect or consequential damages arising from use of the service. Your statutory rights are not affected where they cannot be waived.',
          ],
        },
        {
          heading: 'Changes',
          body: [
            'We may update these Terms from time to time. Continued use after changes become effective constitutes acceptance unless applicable law requires otherwise.',
          ],
        },
      ]}
    />
  );
}
