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
    <!-- end chat leftsidebar -->
    <!-- Start User chat -->
    <div class="user-chat w-100 overflow-hidden">
        <div class="chat-content d-lg-flex">
            <!-- start chat conversation section -->
            <div class="w-100 overflow-hidden position-relative">
                <!-- conversation user -->
                <div class="position-relative">
                    <div class="position-relative" id="users-chat">
                        <div class="p-3 user-chat-topbar" style="">
                            <div class="row align-items-center">
                                <div class="col-sm-4 col-8">
                                    <div class="d-flex align-items-center">
                                        <div class="flex-shrink-0 d-block d-lg-none me-3">
                                            <a href="javascript: void(0);" class="user-chat-remove fs-18 p-1"><i class="ri-arrow-left-s-line align-bottom"></i></a>
                                        </div>
                                        <div class="flex-grow-1 overflow-hidden">
                                            <div class="d-flex align-items-center">
                                                <div class="flex-shrink-0 chat-user-img online user-own-img align-self-center me-3 ms-0">
                                                    <img src="<?=base_url() . 'assets/app/images/users/avatar-1.jpg' ?>" class="rounded-circle avatar-xs" alt="error">

                                                    <!--<span class="user-status"></span>-->
                                                </div>
                                                <div class="flex-grow-1 overflow-hidden">
                                                    <h5 class="text-truncate mb-0 fs-16"><a class="text-reset username" data-bs-toggle="offcanvas" href="#userProfileCanvasExample" aria-controls="userProfileCanvasExample">Admin</a></h5>
                                                    <!--<p class="text-truncate text-muted fs-14 mb-0 userStatus"><small>Online</small></p>-->
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-sm-8 col-4">
                                    <ul class="list-inline user-chat-nav text-end mb-0">
                                        <!--<li class="list-inline-item m-0">-->
                                        <!--    <div class="dropdown">-->
                                        <!--        <button class="btn btn-ghost-secondary btn-icon" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">-->
                                        <!--            <i data-feather="search" class="icon-sm"></i>-->
                                        <!--        </button>-->
                                        <!--        <div class="dropdown-menu p-0 dropdown-menu-end dropdown-menu-lg">-->
                                        <!--            <div class="p-2">-->
                                        <!--                <div class="search-box">-->
                                        <!--                    <input type="text" class="form-control bg-light border-light" placeholder="Search here..." onkeyup="searchMessages()" id="searchMessage">-->
                                        <!--                    <i class="ri-search-2-line search-icon"></i>-->
                                        <!--                </div>-->
                                        <!--            </div>-->
                                        <!--        </div>-->
                                        <!--    </div>-->
                                        <!--</li>-->

                                        <!--<li class="list-inline-item d-none d-lg-inline-block m-0">-->
                                        <!--    <button type="button" class="btn btn-ghost-secondary btn-icon" data-bs-toggle="offcanvas" data-bs-target="#userProfileCanvasExample" aria-controls="userProfileCanvasExample">-->
                                        <!--        <i data-feather="info" class="icon-sm"></i>-->
                                        <!--    </button>-->
                                        <!--</li>-->

                                        <!--<li class="list-inline-item m-0">-->
                                        <!--    <div class="dropdown">-->
                                        <!--        <button class="btn btn-ghost-secondary btn-icon" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">-->
                                        <!--            <i data-feather="more-vertical" class="icon-sm"></i>-->
                                        <!--        </button>-->
                                        <!--        <div class="dropdown-menu dropdown-menu-end">-->
                                        <!--            <a class="dropdown-item d-block d-lg-none user-profile-show" href="#"><i class="ri-user-2-fill align-bottom text-muted me-2"></i> View Profile</a>-->
                                        <!--            <a class="dropdown-item" href="#"><i class="ri-inbox-archive-line align-bottom text-muted me-2"></i> Archive</a>-->
                                        <!--            <a class="dropdown-item" href="#"><i class="ri-mic-off-line align-bottom text-muted me-2"></i> Muted</a>-->
                                        <!--            <a class="dropdown-item" href="#"><i class="ri-delete-bin-5-line align-bottom text-muted me-2"></i> Delete</a>-->
                                        <!--        </div>-->
                                        <!--    </div>-->
                                        <!--</li>-->
                                    </ul>
                                </div>
                            </div>

                        </div>
                        <!-- end chat user head -->
                        <div class="chat-conversation p-3 p-lg-4 " id="chat-conversation">
                            <ul class="list-unstyled chat-conversation-list" id="chat-conversation-list">
                                
                            </ul>
                            <!-- end chat-conversation-list -->
                        </div>
                    </div>

                    <div class="chat-input-section p-3 p-lg-4">

                        <form>
                            <div class="row g-0 align-items-center">

                                <div class="col">
                                    <div class="chat-input-feedback">
                                        Please Enter a Message
                                    </div>
                                    <input type="text" class="form-control chat-input bg-light border-light" id="chat-input" placeholder="Type your message..." name="message" autocomplete="off">
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

                    <div class="replyCard">
                        <div class="card mb-0">
                            <div class="card-body py-3">
                                <div class="replymessage-block mb-0 d-flex align-items-start">
                                    <div class="flex-grow-1">
                                        <h5 class="conversation-name"></h5>
                                        <p class="mb-0"></p>
                                    </div>
                                    <div class="flex-shrink-0">
                                        <button type="button" id="close_toggle" class="btn btn-sm btn-link mt-n2 me-n3 fs-18">
                                            <i class="bx bx-x align-middle"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<!-- end chat-wrapper -->
<script>
    $(document).ready(function() {
    // Function to fetch and display messages
    function fetchMessages() {
        $.ajax({
            url: '<?= base_url('centre/support/get_messages') ?>',
            method: 'GET',
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
                // setTimeout(function() {
                    var chatConversation = document.getElementById('chat-conversation');
                    chatConversation.scrollTop = chatConversation.scrollHeight;
                // }, 100); // Small delay to ensure the DOM is updated
            },
            error: function(xhr, status, error) {
                console.error('Error fetching messages:', error);
                console.log(response);
            }
        });
    }

    // Fetch messages immediately when the page loads
    fetchMessages();

    // Set an interval to fetch messages every 10 seconds
    setInterval(fetchMessages, 10000);
    
    // Updated sendMessage function to accept a callback
function sendMessage(message, callback) {
    $.ajax({
        url: '<?= base_url('centre/support/submit_message') ?>',
        method: 'POST',
        data: { message: message },
        dataType: 'json',
        success: function(response) {
            console.log('Message sent successfully:', response);
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
    $('#chat-input').keydown(function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        console.log('Enter key pressed inside the input!');
        var message = $('#chat-input')[0].value;
        $('#chat-input')[0].value = '';
        sendMessage(message);
        fetchMessages();
        // Perform your desired action
    }
});

});
</script>

<footer class="footer">
    <div class="container-fluid">
        <div class="row">
            <div class="col-sm-6">
                <script>document.write(new Date().getFullYear())</script> © Trogon.
            </div>
            <div class="col-sm-6">
                <div class="text-sm-end d-none d-sm-block">
                </div>
            </div>
        </div>
    </div>
</footer>
            