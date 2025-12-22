export const VoiceAlert = Swal.mixin({
    customClass: {
        popup: 'bg-neutral-900 border border-white/20 rounded-xl shadow-2xl',
        title: 'text-cyan-400 font-bold text-xl',
        htmlContainer: 'text-gray-300',
        confirmButton: 'bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors mx-2',
        cancelButton: 'bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-colors mx-2'
    },
    buttonsStyling: false,
    background: '#171717',
    color: '#ffffff',
    confirmButtonText: 'Entendido'
});
