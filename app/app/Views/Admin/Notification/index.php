
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
<style>
    .notification-item {
        padding: 15px;
        border-left: 3px solid transparent;
        margin-bottom: 10px;
        transition: all 0.3s ease;
    }

    .notification-item:hover {
        background-color: #f8f9fa;
        cursor: pointer;
    }

    .notification-item.unread {
        border-left-color: #0d6efd;
        background-color: rgba(13, 110, 253, 0.05);
    }

    .notification-item.read {
        border-left-color: #6c757d;
    }

    .notification-time {
        color: #6c757d;
        font-size: 0.8rem;
    }

    .notification-badge {
        position: absolute;
        top: -5px;
        right: -5px;
    }

    .nav-link {
        position: relative;
    }

    .empty-notification {
        padding: 20px;
        text-align: center;
        color: #6c757d;
    }
</style>

<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?? '' ?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?= base_url('app/dashboard/index') ?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?= $page_title ?? '' ?></li>
                </ol>
            </div>

        </div>
    </div>
</div>

<div class="row">
    <div class="col-md-12 mx-auto">
        <div class="card shadow-sm">
            <div class="card-header bg-white">
                <h5 class="mb-0">Notifications</h5>
            </div>
            <div class="card-body">
                <?php
                // Count unread notifications
                $unreadCount = 0;
                foreach ($notifications as $notification) {
                    if ($notification['is_read'] == 0) { // Fixed typo: 'is_readed' to 'is_read'
                        $unreadCount++;
                    }
                }

                // Separate read and unread notifications
                $unreadNotifications = array_filter($notifications, function ($item) {
                    return $item['is_read'] == 0; // Fixed typo: 'is_readed' to 'is_read'
                });

                $readNotifications = array_filter($notifications, function ($item) {
                    return $item['is_read'] == 1; // Fixed typo: 'is_readed' to 'is_read'
                });
                ?>

                <!-- Notification Tabs -->
                <ul class="nav nav-tabs mb-3" id="notificationTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="unread-tab" data-bs-toggle="tab" data-bs-target="#unread" type="button" role="tab" aria-controls="unread" aria-selected="true">
                            Unread
                            <?php if ($unreadCount > 0): ?>
                                <span class="badge bg-primary rounded-pill ms-1"><?php echo $unreadCount; ?></span>
                            <?php endif; ?>
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="read-tab" data-bs-toggle="tab" data-bs-target="#read" type="button" role="tab" aria-controls="read" aria-selected="false">
                            Read
                            <?php if (count($readNotifications) > 0): ?>
                                <span class="badge bg-secondary rounded-pill ms-1"><?php echo count($readNotifications); ?></span>
                            <?php endif; ?>
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="all-tab" data-bs-toggle="tab" data-bs-target="#all" type="button" role="tab" aria-controls="all" aria-selected="false">
                            All
                            <?php if (count($notifications) > 0): ?>
                                <span class="badge bg-secondary rounded-pill ms-1"><?php echo count($notifications); ?></span>
                            <?php endif; ?>
                        </button>
                    </li>
                </ul>

                <!-- Tab Content -->
                <div class="tab-content" id="notificationTabsContent">

                    <!-- Unread Notifications -->
                    <div class="tab-pane fade show active" id="unread" role="tabpanel" aria-labelledby="unread-tab">
                        <?php if (count($unreadNotifications) > 0): ?>
                            <?php foreach ($unreadNotifications as $notification): ?>
                                <div class="notification-item unread rounded"
                                    onclick="window.location.href='<?= base_url($notification['url']) ?>'">
                                    <div class="d-flex justify-content-between">
                                        <div class="notification-icon me-3">
                                            <i class="fas fa-bell text-primary"></i>
                                        </div>
                                        <div class="flex-grow-1">
                                            <h6 class="mb-1 fw-bold"><?php echo ($notification['title']); ?></h6>
                                            <p class="mb-1"><?php echo ($notification['description']); ?></p>
                                            <small class="notification-time">
                                                <?php
                                                $date = new DateTime($notification['created_at']);
                                                echo $date->format('M d, Y - h:i A');
                                                ?>
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <div class="empty-notification">
                                <i class="fas fa-check-circle fa-3x mb-3"></i>
                                <p>No unread notifications</p>
                            </div>
                        <?php endif; ?>
                    </div>

                    <!-- Read Notifications -->
                    <div class="tab-pane fade" id="read" role="tabpanel" aria-labelledby="read-tab">
                        <?php if (count($readNotifications) > 0): ?>
                            <?php foreach ($readNotifications as $notification): ?>
                                <div class="notification-item read rounded"
                                    onclick="window.location.href='<?= base_url($notification['url']) ?>'">
                                    <div class="d-flex justify-content-between">
                                        <div class="notification-icon me-3">
                                            <i class="fas fa-bell-slash text-secondary"></i>
                                        </div>
                                        <div class="flex-grow-1">
                                            <h6 class="mb-1"><?php echo ($notification['title']); ?></h6>
                                            <p class="mb-1"><?php echo ($notification['description']); ?></p>
                                            <small class="notification-time">
                                                <?php
                                                $date = new DateTime($notification['created_at']);
                                                echo $date->format('M d, Y - h:i A');
                                                ?>
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <div class="empty-notification">
                                <i class="fas fa-inbox fa-3x mb-3"></i>
                                <p>No read notifications</p>
                            </div>
                        <?php endif; ?>
                    </div>

                    <!-- All Notifications -->
                    <div class="tab-pane fade" id="all" role="tabpanel" aria-labelledby="all-tab">
                        <?php if (count($notifications) > 0): ?>
                            <?php foreach ($notifications as $notification): ?>
                                <div class="notification-item <?php echo $notification['is_read'] == 0 ? 'unread' : 'read'; ?> rounded" 
                                onclick="window.location.href='<?= base_url($notification['url']) ?>'">
                                    <div class="d-flex justify-content-between">
                                        <div class="notification-icon me-3">
                                            <?php if ($notification['is_read'] == 0): ?>
                                                <i class="fas fa-bell text-primary"></i>
                                            <?php else: ?>
                                                <i class="fas fa-bell-slash text-secondary"></i>
                                            <?php endif; ?>
                                        </div>
                                        <div class="flex-grow-1">
                                            <h6 class="mb-1 <?php echo $notification['is_read'] == 0 ? 'fw-bold' : ''; ?>"><?php echo ($notification['title']); ?></h6>
                                            <p class="mb-1"><?php echo ($notification['description']); ?></p>
                                            <small class="notification-time">
                                                <?php
                                                $date = new DateTime($notification['created_at']);
                                                echo $date->format('M d, Y - h:i A');
                                                ?>
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <div class="empty-notification">
                                <i class="fas fa-bell-slash fa-3x mb-3"></i>
                                <p>No notifications available</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <div class="card-footer bg-white text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="clearAllNotifications()">
                    <i class="fas fa-trash-alt me-1"></i> Clear All
                </button>
            </div>
        </div>
    </div>
</div>

<script>
    // Call markAsRead after page fully loaded
    window.onload = function () {
        markAsRead();
    };

    function markAsRead() {
        $.ajax({
            url: "<?= base_url('admin/notification/mark_as_read') ?>",  
            type: "POST",
            dataType: "json",
            success: function (response) {
                console.log("Notifications marked as read:", response);
            },
            error: function (xhr, status, error) {
                console.error("Error marking notifications:", error);      
            }
        });
    }

    function clearAllNotifications() {
        confirm_modal(
            'Are you sure?', 
            'Do you really want to clear all notifications? This action cannot be undone.', 
            'Yes, Clear All!'
        ).then((result) => {
            console.log(result);
            if (result.isConfirmed) {
                $.ajax({
                    url: "<?= base_url('admin/notification/clear_all') ?>",  
                    type: "POST",
                    dataType: "json",
                    success: function (response) {
                        console.log("All notifications cleared:", response);
                        location.reload();
                       
                    },
                    error: function (xhr, status, error) {
                        console.error("Error clearing notifications:", error);
                    }
                });
            }
        });
    }
</script>
























<!-- start page title -->
<!-- <div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div> -->
<div class="row d-none">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    <div class="col-4">
                        <button class="btn btn-md btn-primary rounded-pill float-end"
                                onclick="show_ajax_modal('<?=base_url('admin/notification/ajax_add/')?>', 'Add Notification')">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Title</th>
                        <th style="width: 100px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['title']?></td>
                                    <td >
                                        <!--<a href="javascript::void()" class=" btn btn-secondary btn-sm px-2 rounded-pill edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/notification/ajax_edit/'.$list_item['id'])?>', 'Update Notification')">-->
                                        <!--    <i class="ri-pencil-fill align-bottom "></i> Edit-->
                                        <!--</a>-->
                                        <a href="javascript::void()" class="btn btn-outline-danger btn-sm px-2 rounded-pill remove-item-btn" onclick="delete_modal('<?=base_url('admin/notification/delete/'.$list_item['id'])?>')">
                                            <i class="ri-delete-bin-fill align-bottom "></i> Delete
                                        </a>
                                        
                                    </td>
                                     
                                </tr>
                                <?php
                            }
                        }
                    ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div><!--end row-->





