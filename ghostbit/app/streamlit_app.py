"""
GhostBit Streamlit Web Application
Multi-Modal Content-Adaptive Steganography Framework
"""

import streamlit as st
import tempfile
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ghostbit.core.crypto import KeyPair, load_public_key
from ghostbit.core.payload import MediaType
from ghostbit.core.capacity import format_capacity_info
from ghostbit.stego.image_stego import ImageSteganography, analyze_image_capacity
from ghostbit.stego.audio_stego import AudioSteganography, analyze_audio_capacity
from ghostbit.stego.video_stego import VideoSteganography, analyze_video_capacity
from ghostbit.metrics.image_metrics import analyze_image_quality, format_image_metrics
from ghostbit.metrics.audio_metrics import analyze_audio_quality, format_audio_metrics
from ghostbit.metrics.video_metrics import analyze_video_quality, format_video_metrics


st.set_page_config(
    page_title="GhostBit - Steganography Framework",
    page_icon="👻",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1E88E5;
        text-align: center;
        margin-bottom: 1rem;
    }
    .sub-header {
        font-size: 1rem;
        color: #666;
        text-align: center;
        margin-bottom: 2rem;
    }
    .success-box {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #E8F5E9;
        border: 1px solid #4CAF50;
    }
    .warning-box {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #FFF3E0;
        border: 1px solid #FF9800;
    }
    .info-box {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #E3F2FD;
        border: 1px solid #2196F3;
    }
</style>
""", unsafe_allow_html=True)


def get_media_type_from_extension(filename: str) -> str:
    """Determine media type from file extension."""
    ext = filename.lower().split('.')[-1]
    if ext == 'png':
        return 'image'
    elif ext == 'wav':
        return 'audio'
    elif ext in ['mp4', 'm4v', 'mov', 'mpeg4', 'mkv', 'avi']:
        return 'video'
    return 'unknown'


def validate_file_format(filename: str, expected_type: str) -> bool:
    """Validate file format."""
    ext = filename.lower().split('.')[-1]
    if expected_type == 'image':
        return ext == 'png'
    elif expected_type == 'audio':
        return ext == 'wav'
    elif expected_type == 'video':
        return ext in ['mp4', 'avi', 'mov']
    return False


def render_key_generation_tab():
    """Render the Receiver - Generate Keys tab."""
    st.header("Receiver - Generate Keys")
    
    st.markdown("""
    Generate your X25519 key pair for secure communication.
    - **Private Key**: Keep this secure! Never share it.
    - **Public Key**: Share this with senders.
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("Generate New Key Pair", type="primary", use_container_width=True):
            keypair = KeyPair.generate()
            st.session_state['keypair'] = keypair
            st.session_state['private_pem'] = keypair.private_pem()
            st.session_state['public_pem'] = keypair.public_pem()
            st.success("Key pair generated successfully!")
    
    if 'keypair' in st.session_state:
        st.subheader("Your Keys")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Private Key (KEEP SECRET!)**")
            st.code(st.session_state['private_pem'].decode('utf-8'), language='text')
            st.download_button(
                label="Download Private Key",
                data=st.session_state['private_pem'],
                file_name="private_key.pem",
                mime="application/x-pem-file",
                use_container_width=True
            )
        
        with col2:
            st.markdown("**Public Key (Share with senders)**")
            st.code(st.session_state['public_pem'].decode('utf-8'), language='text')
            st.download_button(
                label="Download Public Key",
                data=st.session_state['public_pem'],
                file_name="public_key.pem",
                mime="application/x-pem-file",
                use_container_width=True
            )
        
        st.info("Save both keys securely. You will need the private key to decrypt messages.")


def render_embed_tab():
    """Render the Sender - Embed tab."""
    st.header("Sender - Embed Secret Message")
    
    st.markdown("""
    Encrypt and embed your secret message into a cover media file.
    Supported formats: PNG (images), WAV (audio), MP4 (video)
    """)
    
    with st.sidebar:
        st.subheader("Advanced Settings")
        
        st.markdown("**Image Settings**")
        bits_per_channel = st.slider("Bits per channel", 1, 4, 1, key="img_bpc")
        
        st.markdown("**Audio Settings**")
        frame_size = st.selectbox("Frame size", [1024, 2048, 4096], index=1)
        hop_length = st.selectbox("Hop length", [512, 1024, 2048], index=1)
    
    cover_file = st.file_uploader(
        "Upload Cover Media (PNG/WAV/MP4)",
        type=['png', 'wav', 'mp4', 'm4v', 'mov', 'mpeg4'],
        help="Select a cover file to hide your message in"
    )
    
    public_key_input = st.text_area(
        "Receiver's Public Key (PEM format)",
        height=150,
        placeholder="Paste the receiver's public key here..."
    )
    
    public_key_file = st.file_uploader(
        "Or upload public key file",
        type=['pem'],
        help="Upload receiver's public_key.pem file"
    )
    
    secret_message = st.text_area(
        "Secret Message",
        height=100,
        placeholder="Enter your secret message here..."
    )
    
    if cover_file:
        media_type = get_media_type_from_extension(cover_file.name)
        cover_data = cover_file.getvalue()
        
        st.subheader("Capacity Analysis")
        
        try:
            if media_type == 'image':
                capacity = analyze_image_capacity(cover_data, bits_per_channel)
                st.text(format_capacity_info(capacity, 'image'))
            elif media_type == 'audio':
                capacity = analyze_audio_capacity(cover_data, frame_size, hop_length)
                st.text(format_capacity_info(capacity, 'audio'))
            elif media_type == 'video':
                capacity = analyze_video_capacity(cover_data)
                st.info(
                    f"**Video**: MP4 atom embedding. "
                    f"Message is encrypted and stored in the MP4 container. "
                    f"Video/audio streams are untouched."
                )
            
            max_message_len = capacity.get('usable_capacity_bytes', 0)
            current_len = len(secret_message.encode('utf-8')) if secret_message else 0
            
            if current_len > 0:
                progress = min(current_len / max_message_len, 1.0) if max_message_len > 0 else 1.0
                st.progress(progress, text=f"Message size: {current_len}/{max_message_len} bytes")
                
                if current_len > max_message_len:
                    st.error(f"Message too large! Reduce by {current_len - max_message_len} bytes.")
        except Exception as e:
            st.error(f"Capacity analysis failed: {str(e)}")
    
    if st.button("Embed Message", type="primary", use_container_width=True):
        if not cover_file:
            st.error("Please upload a cover media file.")
            return
        
        public_key_pem = None
        if public_key_file:
            public_key_pem = public_key_file.getvalue()
        elif public_key_input.strip():
            public_key_pem = public_key_input.strip().encode('utf-8')
        
        if not public_key_pem:
            st.error("Please provide the receiver's public key.")
            return
        
        if not secret_message.strip():
            st.error("Please enter a secret message.")
            return
        
        try:
            media_type = get_media_type_from_extension(cover_file.name)
            cover_data = cover_file.getvalue()
            
            with st.spinner(f"Embedding message into {media_type}..."):
                if media_type == 'image':
                    stego = ImageSteganography(bits_per_channel)
                    stego_data, metadata = stego.embed(cover_data, secret_message, public_key_pem)
                    output_ext = 'png'
                    
                    metrics = analyze_image_quality(cover_data, stego_data)
                    st.subheader("Quality Metrics")
                    st.text(format_image_metrics(metrics))
                    
                elif media_type == 'audio':
                    stego = AudioSteganography(frame_size, hop_length)
                    stego_data, metadata = stego.embed(cover_data, secret_message, public_key_pem)
                    output_ext = 'wav'
                    
                    metrics = analyze_audio_quality(cover_data, stego_data)
                    st.subheader("Quality Metrics")
                    st.text(format_audio_metrics(metrics))
                    
                elif media_type == 'video':
                    stego = VideoSteganography()
                    stego_data, metadata = stego.embed(cover_data, secret_message, public_key_pem)
                    output_ext = 'mp4'
                else:
                    st.error("Unsupported media type.")
                    return
            
            st.success("Message embedded successfully!")
            
            st.subheader("Embedding Metadata")
            st.json(metadata)
            
            output_filename = f"stego_{cover_file.name.rsplit('.', 1)[0]}.{output_ext}"
            mime_type = 'image/png' if output_ext == 'png' else 'audio/wav' if output_ext == 'wav' else 'video/mp4'
            st.download_button(
                label=f"Download Stego {media_type.title()}",
                data=stego_data,
                file_name=output_filename,
                mime=mime_type,
                type="primary",
                use_container_width=True
            )
            
        except Exception as e:
            st.error(f"Embedding failed: {str(e)}")


def render_extract_tab():
    """Render the Receiver - Extract tab."""
    st.header("Receiver - Extract Secret Message")
    
    st.markdown("""
    Extract and decrypt the hidden message from a stego media file.
    You will need your private key to decrypt the message.
    """)
    
    with st.sidebar:
        st.subheader("Extraction Settings")
        
        st.markdown("**Image Settings**")
        extract_bpc = st.slider("Bits per channel", 1, 4, 1, key="extract_img_bpc")
        
        st.markdown("**Audio Settings**")
        extract_frame_size = st.selectbox("Frame size", [1024, 2048, 4096], index=1, key="extract_fs")
        extract_hop_length = st.selectbox("Hop length", [512, 1024, 2048], index=1, key="extract_hl")
    
    stego_file = st.file_uploader(
        "Upload Stego Media (PNG/WAV/MP4)",
        type=['png', 'wav', 'mp4', 'm4v', 'mov', 'mkv', 'avi', 'mpeg4'],
        help="Select the stego file containing the hidden message"
    )
    
    private_key_input = st.text_area(
        "Your Private Key (PEM format)",
        height=150,
        placeholder="Paste your private key here..."
    )
    
    private_key_file = st.file_uploader(
        "Or upload private key file",
        type=['pem'],
        help="Upload your private_key.pem file"
    )
    
    if st.button("Extract Message", type="primary", use_container_width=True):
        if not stego_file:
            st.error("Please upload a stego media file.")
            return
        
        private_key_pem = None
        if private_key_file:
            private_key_pem = private_key_file.getvalue()
        elif private_key_input.strip():
            private_key_pem = private_key_input.strip().encode('utf-8')
        
        if not private_key_pem:
            st.error("Please provide your private key.")
            return
        
        try:
            media_type = get_media_type_from_extension(stego_file.name)
            stego_data = stego_file.getvalue()
            
            with st.spinner(f"Extracting message from {media_type}..."):
                if media_type == 'image':
                    stego = ImageSteganography(bits_per_channel=extract_bpc)
                    message, integrity_valid, metadata = stego.extract(stego_data, private_key_pem)
                    
                elif media_type == 'audio':
                    stego = AudioSteganography(extract_frame_size, extract_hop_length)
                    message, integrity_valid, metadata = stego.extract(stego_data, private_key_pem)
                    
                elif media_type == 'video':
                    # Check if user is trying old MKV stego file
                    if stego_data[:4] == b'\x1aE\xdf\xa3':
                        st.error(
                            "This appears to be an MKV file created with the old steganography method. "
                            "Please re-embed your message using the new version, which produces standard MP4 files."
                        )
                        return
                    
                    stego = VideoSteganography()
                    message, integrity_valid, metadata = stego.extract(stego_data, private_key_pem)
                else:
                    st.error("Unsupported media type.")
                    return
            
            st.subheader("Extracted Message")
            
            if integrity_valid:
                st.success("Integrity verification: PASSED")
            else:
                st.warning("Integrity verification: FAILED - Message may be corrupted")
            
            st.text_area(
                "Decrypted Message",
                value=message,
                height=150,
                disabled=True
            )
            
            st.subheader("Extraction Metadata")
            st.json(metadata)
            
        except Exception as e:
            st.error(f"Extraction failed: {str(e)}")
            st.info("Make sure you're using the correct private key and settings.")


def render_help_tab():
    """Render the Help & Safe Sharing tab."""
    st.header("Help & Safe Sharing Guide")
    
    st.subheader("How GhostBit Works")
    
    st.markdown("""
    GhostBit uses **hybrid cryptography** combined with **steganography** to hide encrypted messages 
    in media files:
    
    1. **Key Exchange**: X25519 elliptic curve Diffie-Hellman
    2. **Key Derivation**: HKDF-SHA256
    3. **Encryption**: AES-256-GCM (authenticated encryption)
    4. **Integrity**: SHA-256 hash verification
    """)
    
    st.subheader("Workflow")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        **Step 1: Receiver**
        1. Generate key pair
        2. Keep private key secure
        3. Share public key with sender
        """)
    
    with col2:
        st.markdown("""
        **Step 2: Sender**
        1. Get receiver's public key
        2. Write secret message
        3. Choose cover media file
        4. Embed and download stego file
        5. Send stego file to receiver
        """)
    
    with col3:
        st.markdown("""
        **Step 3: Receiver**
        1. Receive stego file
        2. Load private key
        3. Extract message
        4. Verify integrity
        """)
    
    st.subheader("Supported Formats")
    
    st.markdown("""
    | Media Type | Input Format | Output Format | Notes |
    |------------|--------------|---------------|-------|
    | Image | PNG | PNG | Lossless, recommended |
    | Audio | WAV | WAV | Uncompressed audio |
    | Video | MP4 | MP4 | Frame-based embedding |
    """)
    
    st.subheader("Safe Sharing Practices")
    
    st.warning("""
    **IMPORTANT: Recompression destroys hidden data!**
    
    - DO NOT share via platforms that recompress media (WhatsApp images, Instagram, etc.)
    - DO NOT convert file formats after embedding
    - DO NOT apply filters or edits to stego files
    """)
    
    st.success("""
    **Safe methods to share stego files:**
    
    - Email attachments
    - Cloud storage (Google Drive, Dropbox, OneDrive)
    - File transfer services (WeTransfer, Mega)
    - USB drives
    - Send as "Document" in messaging apps (not as media)
    """)
    
    st.subheader("Troubleshooting")
    
    with st.expander("Extraction fails with 'Invalid payload'"):
        st.markdown("""
        - The file may have been recompressed during transfer
        - Make sure you're using the correct settings (bits per channel, frame size, etc.)
        - Verify you're using the correct private key
        """)
    
    with st.expander("Message is corrupted"):
        st.markdown("""
        - Integrity check failed - the file was modified
        - Try sending the file again using a lossless method
        - For video, try increasing the redundancy factor
        """)
    
    with st.expander("Capacity is too low"):
        st.markdown("""
        - Use a larger cover file with more texture/detail
        - Increase bits per channel (reduces quality)
        - For audio, use longer recordings
        - For video, use videos with more motion
        """)
    
    st.subheader("Security Notes")
    
    st.info("""
    - Your private key NEVER leaves your system
    - All cryptographic operations happen locally in your browser
    - We do not store or transmit any keys or messages
    - The stego file can be shared on any channel - only the private key holder can decrypt
    """)


def main():
    """Main application entry point."""
    st.markdown('<h1 class="main-header">GhostBit</h1>', unsafe_allow_html=True)
    st.markdown(
        '<p class="sub-header">Multi-Modal Content-Adaptive Steganography Framework</p>',
        unsafe_allow_html=True
    )
    
    tab1, tab2, tab3, tab4 = st.tabs([
        "Receiver - Generate Keys",
        "Sender - Embed",
        "Receiver - Extract",
        "Help & Safe Sharing"
    ])
    
    with tab1:
        render_key_generation_tab()
    
    with tab2:
        render_embed_tab()
    
    with tab3:
        render_extract_tab()
    
    with tab4:
        render_help_tab()
    
    st.markdown("---")
    st.markdown(
        "<p style='text-align: center; color: #888;'>GhostBit v1.0.0 | "
        "A secure steganography framework for hiding encrypted messages</p>",
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main()
