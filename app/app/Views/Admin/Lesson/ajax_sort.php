<style>
    .modal-body {
        background-color: #E1EBE9 !important;
    }
</style>

<?php if (!empty($lessons)){ ?>

<form id="lesson-form"  >
    <div class="row" id="lesson-list">
        <!--<input type="hidden" value="</?=$subject_id?>" id="subject_id" >-->
        <input type="hidden" value="<?=$course_id?>" id="course_id" >
        
        <?php foreach ($lessons as $key => $les) { ?>
            <div class="col-lg-12 p-2">
                <div>
                    <div class="card mb-0 mt-2 draggable-item" id="<?php echo $les['id']; ?>">
                        <div class="card-body">
                            <div class="media">
                                <div class="media-body">
                                    <h5 class="mb-1 mt-0"> <?= $les['title'] ?> </h5>
                                </div> <!-- end media-body -->
                            </div> <!-- end media -->
                        </div> <!-- end card-body -->
                    </div> <!-- end col -->
                </div>
            </div>
        <?php } ?>

        <div class="col-12 p-2">
            <button id="save-order-btn" class="btn btn-success float-end btn-save" type="button">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>

<?php } ?>


<script>
    
var base_url = '<?=base_url('admin/')?>';



$(document).on('shown.bs.modal', '#small_modal', function () {
    const lessonList = document.getElementById('lesson-list');
    
    if (lessonList) {
        // Avoid multiple initializations
        if (!lessonList.classList.contains('sortable-initialized')) {
            lessonList.classList.add('sortable-initialized');

            new Sortable(lessonList, {
                animation: 150,
                filter: '.btn',
                handle: '.draggable-item', // optional handle
                onEnd: function (evt) {
                    console.log('Reordered:', evt.oldIndex, '→', evt.newIndex);
                }
            });

            console.log(" Sortable initialized in modal!");
        }
    } else {
        console.warn("⚠️ lesson-list not found in modal at init time.");
    }






});

    
    document.getElementById('save-order-btn').addEventListener('click', function() {
        var lessonOrder = [];
        var lessonCards = document.querySelectorAll('.draggable-item');
        
        // Iterate over lesson cards to extract their IDs
        lessonCards.forEach(function(card) {
            lessonOrder.push(card.id);
        });
        
        
        var course_id = $("#course_id").val();
        console.log('lesson order:', lessonOrder); // Debugging
    
        $.ajax({
            url: base_url + 'lesson/updateOrder',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({ lessonOrder: lessonOrder }),
            success: function(data) {
                console.log('Order updated successfully:', data);
                // Optionally, redirect or show a success message
                var url = new URL(window.location.href);
                var courseId = url.pathname.split("/").pop();
                window.location.href = base_url+'course/add_details/'+courseId;
            },
            error: function(xhr, status, error) {
                console.error('Error updating order:', error);
                // Optionally, show an error message
            }
        });

    });

    
    
    
</script>

