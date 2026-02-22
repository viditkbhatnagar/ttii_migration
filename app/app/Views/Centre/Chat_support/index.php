<style>
    @media (max-width: 991.98px) {
        .user-chat {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: calc(100% - 3px) !important;
            visibility: visible !important;
            -webkit-transform: translateX(0) !important;
            transform: translateX(0) !important;
            z-index: 99 !important;
            padding-top: 70px !important;
        }
    }
    
    #chat-conversation {
    overflow-y: auto;
    max-height: 80vh; /* Adjust this value as needed */
}
</style>

<div class="chat-wrapper d-lg-flex gap-1 mx-n4 mt-n4 p-1">
    <!-- Chat Left Sidebar -->
    <div class="chat-leftsidebar">
        <div class="px-4 pt-4 mb-3">
            <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                    <h5 class="mb-4">Chats</h5>
                </div>
            </div>
        </div>

        <div class="chat-room-list" data-simplebar>
            <div class="d-flex align-items-center px-4 mb-2">
                <div class="flex-grow-1">
                    <h4 class="mb-0 fs-11 text-muted text-uppercase">Direct Messages</h4>
                </div>
            </div>
            <ul>
                <?php foreach ($users as $user) { ?>
                    <li id="contact-id-2" data-name="direct-message" style="list-style: none;">
                        <a href="<?= base_url('centre/chat_support/index/'.$user['id']) ?>" class="unread-msg-user" data-chat-id="<?= $user['id'] ?>">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0 chat-user-img online align-self-center me-2 ms-0">
                                    <div class="avatar-xxs">
                                        <img src="<?= valid_file($users['image']) ? base_url(get_file($users['image'])) : base_url() . 'assets/app/images/users/avatar-1.jpg' ?>" class="rounded-circle img-fluid userprofile" alt="" />
                                    </div>
                                </div>
                                <div class="flex-grow-1 overflow-hidden">
                                    <p class="text-truncate mb-0"><?= $user['name'] ?></p>
                                </div>
                            </div>
                        </a>
                    </li>
                <?php } ?>
            </ul>
        </div>
    </div>
    <!-- End Chat Left Sidebar -->

    <!-- Start User Chat -->
    <?php if ($chat_id != 0) { ?>
        <div class="user-chat w-100 overflow-hidden">
            <div class="chat-content d-lg-flex">
                <!-- Start Chat Conversation Section -->
                <div class="w-100 overflow-hidden position-relative">
                    <div class="position-relative" id="users-chat">
                        <div class="p-3 user-chat-topbar">
                            <div class="row align-items-center">
                                <div class="col-sm-4 col-8">
                                    <div class="d-flex align-items-center">
                                        <div class="flex-shrink-0 d-block d-lg-none me-3">
                                            <a href="javascript: void(0);" class="user-chat-remove fs-18 p-1"><i class="ri-arrow-left-s-line align-bottom"></i></a>
                                        </div>
                                        <div class="flex-grow-1 overflow-hidden">
                                            <div class="d-flex align-items-center">
                                                <div class="flex-shrink-0 chat-user-img online user-own-img align-self-center me-3 ms-0">
                                                    <img src="<?= valid_file($admin['image']) ? base_url(get_file($admin['image'])) : base_url() . 'assets/app/images/users/avatar-1.jpg' ?>" class="rounded-circle avatar-xs" alt="">
                                                    <span class="user-status"></span>
                                                </div>
                                                <div class="flex-grow-1 overflow-hidden">
                                                    <h5 class="text-truncate mb-0 fs-16"><a class="text-reset username" data-bs-toggle="offcanvas" href="#userProfileCanvasExample" aria-controls="userProfileCanvasExample"><?= $user['name'] ?></a></h5>
                                                    <p class="text-truncate text-muted fs-14 mb-0 userStatus" style="visibility: hidden;"><small>Online</small></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                       <div class="chat-conversation p-3 p-lg-4" id="chat-conversation">
                            <ul class="list-unstyled chat-conversation-list" id="chat-conversation-list">
                                <!-- Messages will be dynamically inserted here -->
                            </ul>
                        </div>

                        <!-- Chat Input Section -->
                        <div class="chat-input-section p-3 p-lg-4">
                            <form>
                                <div class="row g-0 align-items-center">
                                    <div class="col">
                                        <div class="chat-input-feedback">
                                            Please Enter a Message
                                        </div>
                                        <input type="text" class="form-control chat-input bg-light border-light" id="chat-input"  name="message" placeholder="Type your message..." autocomplete="off">
                                    </div>
                                    <div class="col-auto">
                                        <div class="chat-input-links ms-2">
                                            <div class="links-list-item">
                                                <button type="button" class="btn btn-success chat-send waves-effect waves-light">
                                                    <i class="ri-send-plane-2-fill align-bottom"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    <?php } else { ?>
        <div class="user-chat w-100 overflow-hidden d-flex align-items-center justify-content-center" style="min-height: 80vh;">
            <span>Select a user to chat</span>
        </div>
    <?php } ?>
</div>

<!-- JavaScript for Dynamic Message Loading -->
<script>
    $(document).ready(function() {
        // Function to fetch and display messages
        function fetchMessages(chatId) {
            $.ajax({
                url: '<?= base_url('admin/chat_support/get_messages') ?>',
                method: 'GET',
                data: { chat_id: chatId },
                dataType: 'json',
                success: function(response) {
                    // Clear the existing messages
                    $('#chat-conversation-list').empty();

                    // Loop through the messages and append them to the chat window
                    response.forEach(function(message) {
                        var messageHtml = '';
                        if (message.sender_id != <?= get_user_id() ?>) {
                            messageHtml = `
                                <li class="chat-list" id="chat-list-${message.id}">
                                    <div class="conversation-list">
                                        <div class="user-chat-content"> 
                                            <div class="ctext-wrap">
                                                <div class="ctext-wrap-content">
                                                    <p class="mb-0 ctext-content">${message.message}</p>
                                                </div>
                                            </div>
                                            <div class="conversation-name">
                                                <small class="text-muted time">${new Date(message.created_at).toLocaleTimeString()}</small>
                                                <span class="text-success check-message-icon"><i class="bx bx-check"></i></span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            `;
                        } else {
                            messageHtml = `
                                <li class="chat-list right" id="chat-list-${message.id}">
                                    <div class="conversation-list">
                                        <div class="user-chat-content">
                                            <div class="ctext-wrap">
                                                <div class="ctext-wrap-content">
                                                    <p class="mb-0 ctext-content">${message.message}</p>
                                                </div>
                                            </div>
                                            <div class="conversation-name">
                                                <small class="text-muted time">${new Date(message.created_at).toLocaleTimeString()}</small>
                                                <span class="text-success check-message-icon"><i class="bx bx-check"></i></span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            `;
                        }
                        $('#chat-conversation-list').append(messageHtml);
                    });

                    // Scroll to the bottom of the chat window
                    var chatConversation = document.getElementById('chat-conversation');
                    chatConversation.scrollTop = chatConversation.scrollHeight;
                },
                error: function(xhr, status, error) {
                    console.error('Error fetching messages:', error);
                }
            });
        }

        // Handle user clicks
        let chatId = <?= $chat_id ?? 0 ?>; // Get the chat_id from the data attribute

        console.log(chatId);

        // Fetch and display messages for the selected user
        fetchMessages(chatId);

        console.log('fetching msgs Chat ID:', chatId);
        // Set an interval to fetch messages every 10 seconds
        setInterval(function() {
            fetchMessages(chatId);
        }, 10000);

        // Function to send a message
        function sendMessage(message, callback) {
            console.log('Sending message:', message);
            console.log('Chat ID:', chatId);
            $.ajax({
                url: '<?= base_url('centre/chat_support/submit_message') ?>',
                method: 'POST',
                data: { message: message, chat_id: chatId },
                dataType: 'json',
                success: function(response) {
                    console.log(response);
                    // Clear the input field after sending the message
                    $('#chat-input').val('');
                    // Fetch messages again to update the chat window
                    if (typeof callback === 'function') {
                        callback(); // Execute the callback (e.g., fetchMessages)
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error sending message:', error);
                }
            });
        }
$(document).on('click', '.chat-send', function(event) {
    console.log('Send button clicked!'); // Updated log message

    // Get the message from the input field
    var messageInput = $('#chat-input');
    var message = messageInput.val().trim(); // Use .val() instead of [0].value

    // Check if the message is not empty
    if (message) {
        // Clear the input field
        messageInput.val('');

        // Send the message
        sendMessage(message, function() {
            // Fetch messages after the message is successfully sent
            fetchMessages();
        });
    } else {
        console.log('Message is empty!'); // Optional: Handle empty message case
    }
});
        // Handle Enter key press in the chat input
        $('#chat-input').on('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent the default form submission
                var message = $(this).val().trim(); // Get the message from the input
                if (message !== '') {
                    sendMessage(message); // Send the message
                }
            }
        });
    });
</script>


<!-- Chat Init JS -->

<!-- App JS -->