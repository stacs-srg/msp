install.packages("lubridate")
library(lubridate)

data = read.csv("final-data.csv", sep=",", head=TRUE)
data$time_taken <- period_to_seconds(hms(data$time_taken))

# Order by user_id, and smiles
data <- data[order(data$user_id, data$smiles),]

p_values_t_test = matrix(nrow = 4, ncol = 4)
# Prediction types
# View p_values varible after running this loop to see all the p-values of each set
for (type1 in 0:3) {
  predictions_1 <- data[data$prediction_type == type1, ]
  for (type2 in 0:3) {
        predictions_2 <- data[data$prediction_type == type2, ]
        # T-test of all data
        result <- t.test(x=predictions_1$time_taken, y=predictions_2$time_taken)
        p_values_t_test[type1 + 1, type2 + 1] = result$p.value
  }  
}
