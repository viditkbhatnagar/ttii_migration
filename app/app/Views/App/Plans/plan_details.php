<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Package Page</title>
    <style>
        .discount-card {
            background-color: orange;
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            display: inline-block;
            font-weight: bold;
            text-align: center;
        }
        .buy-now-btn {
            background-color: red;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            font-weight: bold;
            cursor: pointer;
        }
        .buy-now-btn:disabled {
            background-color: grey;
            cursor: not-allowed;
        }
    </style>
</head>
<body> 
    <div class="row px-md-5">
        <div class="col-md-4">
            <div class="bannerarea mb-4">
                <img src="<?=base_url(get_file($course_details['thumbnail']))?>" alt="" class="rounded-4 img-fluid">
                <h3 class="h3 mt-2"><?= $course_details['title'] ?></h3>
            </div>
        </div>
        <div class="col-md-8">
            <form id="package-form" action="<?=base_url('app/plans/generate_payment')?>" method="GET">
                <input type="hidden" id="package_id" name="package_id" value="<?=$subject_details['id']?>">
                <input type="hidden" id="auth_token" name="auth_token" value="<?=$user_data['auth_token']?>">
                
                <?php foreach($subject_details['subject_packages'] as $details){ ?>
                    <div class="card rounded-4 shadow plan-card">
                        <div class="card-body py-2 d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center">
                                <div class="discount-card">
                                    <p><?=$details['discounted_text']?></p>
                                </div>
                                <div class="ms-3 pt-3">
                                    <h3 class="fw-bold h4"><?=$details['subject_name']?></h3>
                                    <p style="font-size:16px;font-weight:bold;">₹ <?=$details['discount']?></p>
                                    <p style="text-decoration: line-through;">₹ <?=$details['actual_amount']?></p>
                                </div>
                            </div>
                            <div>
                                <input type="checkbox" class="package-checkbox" data-id="<?=$details['id']?>" data-amount="<?=$details['discount']?>" style="transform: scale(2); margin-right:10px;">
                            </div>
                        </div>
                    </div>
                <?php } ?>
                <div class="mt-4 mb-4">
                    <h4>Total Amount: ₹ <span id="total-amount">0</span></h4>
                    <input type="hidden" id="selected-subjects" name="subjects" value="">
                    <button id="buy-now-btn" class="buy-now-btn" type="submit" disabled>Buy Now</button>
                </div>
            </form>
        </div>
    </div>
    <script>
    document.addEventListener('DOMContentLoaded', () => {
        const checkboxes = document.querySelectorAll('.package-checkbox');
        const totalAmountSpan = document.getElementById('total-amount');
        const buyNowBtn = document.getElementById('buy-now-btn');
        const selectedSubjectsInput = document.getElementById('selected-subjects');

        function updateForm() {
            let totalAmount = 0;
            let selectedIds = [];
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    totalAmount += parseFloat(cb.dataset.amount);
                    selectedIds.push(parseInt(cb.dataset.id, 10)); // Use parseInt for numerical IDs
                }
            });
            totalAmountSpan.textContent = totalAmount.toFixed(2);
            selectedSubjectsInput.value = JSON.stringify(selectedIds); // Convert array to JSON
            buyNowBtn.disabled = selectedIds.length === 0;
        }

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateForm);
        });
    });
</script>


</body>
</html>
